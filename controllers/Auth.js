const User = require("../models/User");
const OTP = require("../models/OTP");
const Profile = require("../models/Profile");
const otpGenerator = require("otp-generator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
//sendOTP
exports.sendOTP = async (req, res) => {
  try {
    //fetching email
    const { email } = req.body;
    //checking if user with that email already exists
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res.status(401).json({
        success: false,
        message: "User already registered",
      });
    }

    //generate otp until unique OTP is available
    var otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    let result = await OTP.findOne({ otp: otp });

    while (result) {
      otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      });
      result = await OTP.findOne({ otp: otp });
    }

    //object for otp is created and entry is stored in database
    const otpPayload = { email, otp };

    const otpBody = await OTP.create(otpPayload);
    console.log("OTP Body : " + otpBody);

    res.status(200).json({
      success: true,
      message: "OTP send successfully",
      otp: otp,
    });
  } catch (err) {
    console.log("error while sending OTP ", err);
    res.status(500).json({
      success: false,
      message: "OTP send failed",
      data: err.message,
    });
  }
};
//signup

exports.signUp = async (req, res) => {
  try{
    const {
        firstName,
        lastName,
        email,
        password,
        confirmPassword,
        accountType,
        contactNumber,
        otp,
      } = req.body;
    
      //validation
      if (
        !firstName ||
        !lastName ||
        !email ||
        !password ||
        !confirmPassword ||
        !otp
      ) {
        return res.status(403).json({
          success: false,
          message: "Please enter all necessary information",
        });
      }
    
      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "Password does not match with confirm password",
        });
      }
    
      //check existing user
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }
    
      //find most recent otp for this user
      const recentOtp = await OTP.find({ email }).sort({ createdAt: -1 }).limit(1);
      console.log("recent OTP: " + recentOtp);
    
      //Validate OTP
      if (recentOtp.length == 0) {
        return res.status(400).json({
          success: false,
          message: "OTP not found",
        });
      } else if (recentOtp.otp !== otp) {
        return res.status(400).json({
          success: false,
          message: "OTP not matched",
        });
      }
    
      //hashing of password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hashPassword(password, salt);
    
      const profileDetails = await Profile.create({
        gender:null,
        dateofbirth:null,
        about:null,
        contactNumber:null
      });
    
      const newUser = await User.create({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        accountType,
        contactNumber,
        additionalDetails:profileDetails._id,
        image:`https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName},`
      });
    
      res.status(200).json({ 
        success: true, 
        message: "User created successfully",
        data: newUser 
      });
  }
  catch(err){
    console.log("Error while creating user: " + err.message);
    res.status(500).json({ 
        success: false, 
        message: "Error in signup with user",
      });
  }
};



//login

exports.login = async (req,res) => {
    try{
        const {email,password} = req.body;
        if(
            !email ||
            !password 
        ){
            return res.status(403).json({
                success: false,
                message: "Please enter your all details",
            });
        }

        //user exist or not
        const user = await User.findOne({email}).populate("additionalDetails");
        if(!user){
            return res.status(403).json({
                success: false,
                message: "No user Find, please Signup",
            });
        }

        if(await bcrypt.compare(password, user.password)){
            const payload = {
                email: user.email,
                id: user._id,
                role:user.role
            };
            const token = jwt.sign(payload,process.env.JWT_SECRET,{
                expiresIn:"2h",
            });

            user.token = token;
            user.password = undefined;
            const options = {
                expires:new Date(Date.now() + 3*24*60*60*1000),
                httpOnly:true,
            }
            res.cookie("token",token,options).status(200).json({
                success: true,
                token: token,
                message: "User Login Successfully",
                user: user
            });


        }else{
            return res.status(403).json({
                success: false,
                message: "Password does not match"
            });
        }
    }
    catch(err){
        console.log("Error in login: " + err.message);
        res.status(500).json({
            success: false, 
            message: "Error in login",
        })
    }
}

//password change
