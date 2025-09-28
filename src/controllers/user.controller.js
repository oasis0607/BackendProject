import { wrapAsync } from "../utils/wrapAsync.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken"
import {uploadOnCloudinary} from "../utils/cloudinary.js"

import { ApiResponse } from "../utils/ApiResponse.js";
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
export {registerUser,loginUser,logoutUser,refreshAccessToken};