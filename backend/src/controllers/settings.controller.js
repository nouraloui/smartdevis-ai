const Settings = require('../models/Settings.model');

const getOrCreateSettings = async () => {
  let settings = await Settings.findOne();

  if (!settings) {
    settings = await Settings.create({});
  }

  return settings;
};

exports.getSettings = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();

    res.json({
      success: true,
      data: settings
    });
  } catch (err) {
    next(err);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const currentSettings = await getOrCreateSettings();

    const updatedSettings = await Settings.findByIdAndUpdate(
      currentSettings._id,
      {
        ...req.body,
        updatedBy: req.user?.id || null
      },
      {
        new: true,
        runValidators: true
      }
    );

    res.json({
      success: true,
      message: 'Paramètres mis à jour avec succès',
      data: updatedSettings
    });
  } catch (err) {
    next(err);
  }
};