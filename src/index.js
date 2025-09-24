// require('dotenv').config();
import dotenv from 'dotenv'
import { config } from "dotenv";
import mongoose from "mongoose";
import express from 'express';
import connectDB from "./db/index.js";
import {app } from './app.js'

//approach 1

// async function connectDB(){

// }

// connectDB();

//ife function

// (async()=>{
//     try{
//        await mongoose.connect(process.env.MONGO_URL);
//        app.on("error",(err)=>{
//         console.log("err",err);
//        })

//        app.listen(process.env.PORT,()=>{
//         console.log("App is lstening on port ")
//        });
//     }catch(err){
//       console.log(err) ; 
//       throw err;
//     }
// })()
//approach 2
// connectDB();

dotenv.config({
    path:'./.env'
})

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 3000,()=>{
        console.log(`Server is running on port :${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log(`Mongo db connection failed !`,err)
})