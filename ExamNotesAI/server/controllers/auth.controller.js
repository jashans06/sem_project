import UserModel from "../models/user.model.js";
import { getToken } from "../utils/token.js";

export const googleAuth = async (req, res) => {
  try {
    const { name, email } = req.body;
    const isProduction = process.env.NODE_ENV === "production";
    let user = await UserModel.findOne({ email });
    if (!user) {
      user = await UserModel.create({ name, email });
    }

    let token = await getToken(user._id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json(user)

  } catch (error) {
    return res.status(500).json({ message: `googleSignup Error ${error}` });
  }
}

export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    })
    return res.status(200).json({ message: "LogOut Successfully" })

  } catch (error) {
    return res.status(500).json({ message: `Logout Error ${error}` })
  }
}