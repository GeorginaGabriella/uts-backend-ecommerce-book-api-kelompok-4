const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseHandler');

exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, { statusCode: 400, message: 'File tidak ada' });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return sendError(res, { statusCode: 404, message: 'User tidak ditemukan' });
    }

    user.profilePicture = req.file.path;
    await user.save();

    return sendSuccess(res, {
      message: 'Upload berhasil',
      data: user.profilePicture
    });
  } catch (err) {
    return sendError(res, {
      message: 'Gagal upload: ' + err.message
    });
  }
};
