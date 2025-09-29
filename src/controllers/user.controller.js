import { wrapAsync } from "../utils/wrapAsync.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken"
import {uploadOnCloudinary} from "../utils/cloudinary.js"

import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { mongo } from "mongoose";
const generateAcessRefreshToken=async(userId)=>{
    try{
       const user=await User.findById(userId);
       const accessToken=user.generateAccessToken();
       const refreshToken=user.generateRefreshToken();
       
       user.refreshToken=refreshToken;
       //in our schema password is required before saving
       //so we use validateBeforeSave
       await user.save({validateBeforeSave:false});

       return {accessToken,refreshToken};
    }catch(err){
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }
}
const registerUser=wrapAsync (async(req,res)=>{
    //get user details from frontend
    //if data is coming from form or json it will get in req.body
    const {fullname,email,username,password}=req.body;
    console.log(email);
    console.log("FILES:", req.files);
console.log("BODY:", req.body);
    //validate user details-not empty
    if(fullname===""){
        throw new ApiError(400,"Fullname is required")
    }
    if(email===""){
        throw new ApiError(400,"email is required")
    }
    if(username===""){
        throw new ApiError(400,"username is required")
    }
    if(password===""){
        throw new ApiError(400,"password is required")
    }
    //check if user already exists
    const existedUser=await User.findOne({
        $or:[{email},{username}]
    })

    if(existedUser){
        throw new ApiError(409,"User alredy exists");
    }
    //check for image,check for avtar
    const avtarLocalPath=req.files?.avatar[0]?.path;
    let coverLocalPath;

    if(req.files && Array.isArray(req.files?.coverImage) && req.files.coverImage.length >0){
        coverLocalPath=req.files?.coverImage[0].path;
    }

    if(!avtarLocalPath){
        throw new ApiError(400,"Avtar is required");
    }
    //upload image to  coludinary,avtar checking
    const avatar=await uploadOnCloudinary(avtarLocalPath);
    const coverImage=await uploadOnCloudinary(coverLocalPath);

    if(!avatar){
       throw new ApiError(400,"Avatar file is required");
    }
    //create user object-create entry in db
    const user=await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })
        //remove password and refresh token feild from response
    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"//write those things that you dont want
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registring user")
    }

    //check for user creation return res
    return res.status(201).json(
        new ApiResponse(201,createdUser,"User created successfully")
    )
});

const loginUser=wrapAsync(async(req,res)=>{
    //get data by req.body
    const {email,username,password}=req.body;
    //username or name
    if(!email && !username){
        throw new ApiError(400,"Username or email is required");
    }
    //find the user
    const user=await User.findOne({
        $or:[{email},{username}]
    })
    //password check
    if(!user){
        throw new ApiError(404,"User not found");
    }

    const isPasswordValid=await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials");
    }
    //access token and refresh token
    const {accessToken,refreshToken}=await generateAcessRefreshToken(user._id);

    //send cookies
    const loggedinUser=await User.findById(user._id).select("-password -refreshToken");

    const options={
        httpOnly:true,//using httpOnly only server can modify
        secure:true
    }
    return res.
    status(200).
    cookie("accessToken",accessToken,options )
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedinUser,accessToken,
                refreshToken
            },
            "User logged in successfully"
        )
    )
});

const logoutUser=wrapAsync(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{refreshToken:undefined}
        },{
            new :true
        }
    )
    const options={
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out"))
})

const refreshAccessToken=wrapAsync(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request")
    }

    try{
       const decoded=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);

    const user=await User.findById(decoded._id);

    if(!user){
        throw new ApiError(401,"Invalid refresh token")
    }

    if(incomingRefreshToken !== user?.refreshToken){
        throw new ApiError(401,"Refresh token is expired or used");
    }

    const options={
        httpOnly:true,
        secure:true
    }
    const {accessToken,newrefreshToken}=await generateAcessRefreshToken(user._id);
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",newrefreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                accessToken,
                refreshToken:newrefreshToken
            },
            "Access token refreshed"
        )
    )
    }catch(err){
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }
})

const changeCurrentUserPassword=wrapAsync(async(req,res)=>{
    const {oldPassword,newPassword}=req.body;
    const user=await User.findById(req.user?._id);
    //checking old password
    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect){
        throw new ApiError(400,"Old password is incorrect");
    }
    user.password=newPassword;
    await user.save({validateBeforeSave:false});

    return res.status(200)
    .json(new ApiResponse(200,{},"Password changed successfully"));

});

const getCurrentUser=wrapAsync(async(req,res)=>{
    return res
    .status(200)
    .json(200,req.user,"Current user fetched successfully");
});

const updateAccountSettings=wrapAsync(async(req,res)=>{
    const {fullname,email}=req.body;

    if(!fullname || !email){
        throw new ApiError(400,"All fields are requird");
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
             $set:{
                fullname,
                email
    }
        },{
            new:true
            //using this we get updated user 
        }
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,user,"User account updated successfully"))
});

const updateAvatar=wrapAsync(async(req,res)=>{
    const avatarLocalPath=req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is missing");

    }
    const avatar=await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on avatar ")
    }
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,user,"Avatar updated successfully"))
});

const updateCoverImage=wrapAsync(async(req,res)=>{
    const coverImageLocalPath=req.file?.path;

    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover image file is missing");

    }
    const coverImage=await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading on cover image ")
    }
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Cover image updated successfully"))
});

const getUserChannelProfile=wrapAsync(async(req,res)=>{
    const {username}=req.params;

    if(!username?.trim()){
        throw new ApiError(400,"Username is required");
    }

    const channel=await User.aggregate([
        {
            $match:{
                username:username.toLowerCase()
            }
        },
        {   //lookup is used fro joining collection
            $lookup:{
                from:"subscriptions",//models from data base
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },{
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {   //$addfields fro adding new fields
            $addFields:{
                subscriberCount:{
                    $size:"$subscibers",

                },
                channelSubscriberToCount:{
                    $size:"$subscribedTo"
                },
                isSubcribed:{
                    if:{$in:[req.user?._id,"$subscibers.subscriber"]},
                    then:true,
                    else:false
                }
            }
        },
        {   //project gives us selected number of fields
            $project:{
                fullname:1,
                username:1,
                subscriberCount:1,
                channelSubscriberToCount:1,
                isSubcribed:1,
                avatar:1,
                coverImage:1,
                email:1,

            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404,"Channel does not exist");
    }
    return res.status(200)
    .json(new ApiResponse(200,channel[0],"Channel details fetched successfully"));
});

const getWatchHistory=wrapAsync(async(req,res)=>{

    const user=await User.aggregate([
        {
            
            $match:{
                    _id:new mongoose.Types.ObjectId(req.user?._id)
            }
            
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200,user[0].watchHistory,"Watch history fetched successfully"));
})
export {registerUser,loginUser,logoutUser,refreshAccessToken
    ,changeCurrentUserPassword
    ,getCurrentUser,
    updateAccountSettings,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory
};