import UserModel from "../models/user.model.js"

export const chargeCredits = (userId, amount) => {
  return UserModel.findOneAndUpdate(
    { _id: userId, credits: { $gte: amount } },
    { $inc: { credits: -amount } },
    { new: true }
  )
}

export const refundCredits = (userId, amount) => {
  return UserModel.findByIdAndUpdate(
    userId,
    { $inc: { credits: amount } },
    { new: true }
  )
}
