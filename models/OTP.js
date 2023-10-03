const mongoose = require("mongoose");
const mailSender = require("../utils/mailSender");

const otpSchema = new mongoose.Schema({
    email:{
        type:String,
        required:true,
    },
    otp:{
        type:String,
        required:true,
    },
    createdAt:{
        type:Date,
        default:Date.now(),
        expires: 5*60,
    }
});

// function to send email

async function sendEmailVerification(email,otp){
    try{
        const mailResponse = await mailSender(email,"Verification email",otp);
        console.log("Email sent successfully: ", mailResponse);
    }
    catch(e){
        console.log("error while sending otp verification email " + e);
        throw e;
    }
}

otpSchema.pre("save",async function(next){
    await sendEmailVerification(this.email,this.otp);
    next();
})


module.exports = mongoose.model("OTP", otpSchema);
