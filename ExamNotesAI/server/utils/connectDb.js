// import mongoose from "mongoose";
// const connectDb = async () => {
//     try{
//         await mongoose.connect(process.env.MONGODB_URL)
//         console.log("DB connected")
//     }catch(error){
//         console.log("DB Error")
//     }
// }
// export default connectDb;

import mongoose from "mongoose";

let pending = null;
const connectDb = async () => {
  if (mongoose.connection.readyState === 1) return;
  if (!pending) {
    pending = mongoose.connect(process.env.MONGODB_URL).catch((e) => {
      pending = null;
      throw e;
    });
  }
  await pending;
};
export default connectDb;