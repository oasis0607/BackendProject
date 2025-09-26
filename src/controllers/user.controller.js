import { wrapAsync } from "../utils/wrapAsync.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
const registerUser=wrapAsync (async(req,res)=>{
    //get user details from frontend
    //if data is coming from form or json it will get in req.body
    const {fullname,email,username,password}=req.body;
    console.log(email);
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
    const existedUser=User.findOne({
        $or:[{email},{username}]
    })

    if(existedUser){
        throw new ApiError(409,"User alredy exists");
    }
    //check for image,check for avtar
    const avtarLocalPath=req.files?.avatar[0]?.path;
    const coverLocalPath=req.files?.cover[0]?.path;

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

export {registerUser};