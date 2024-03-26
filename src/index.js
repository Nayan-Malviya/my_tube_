import dotenv from "dotenv";
dotenv.config({ path: "./env" });
import connectDB from "./db/index.js";
// (async()=>{
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error",(error)=>{
//             console.log("ERROR in Express.",error)
//             throw error;
//         })
//         app.listen(process.env.PORT,()=>{
//             console.log(`App is Listening on port ${process.env.PORT}`);
//         })

//     } catch (error) {
//         console.error("ERROR  : ",error);
//         throw error;
//     }
// })()
connectDB()
  .then(() => {
    console.log(`app is listening on ${process.env.PORT}`);
  })
  .catch((error) => {
    console.log("error in mongodb!!! ", error);
  });
