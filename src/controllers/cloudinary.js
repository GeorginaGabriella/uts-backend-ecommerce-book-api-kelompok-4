const cloudinary = require('../config/cloudinary');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseHandler');

exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, { message: 'File tidak ada' });
    }

    const result = await cloudinary.uploader.upload(req.file.path);

    const user = await User.findById(req.user.userId);

    if (!user) {
      return sendError(res, { message: 'User tidak ditemukan' });
    }

    user.profilePicture = result.secure_url;
    await user.save();

    return sendSuccess(res, {
      message: 'Upload berhasil',
      data: result.secure_url
    });

  } catch (err) {
    return sendError(res, {
      message: 'Gagal upload: ' + err.message
    });
  }
};