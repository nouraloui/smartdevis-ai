const iaService = require('../services/ia.service');

exports.detectAnomaly = async (req, res, next) => {
  try {
    const result = await iaService.detectAnomaly(req.body);

    return res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

exports.riskScore = async (req, res, next) => {
  try {
    const result = await iaService.riskScore(req.body);

    return res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

exports.suggestValues = async (req, res, next) => {
  try {
    const result = await iaService.suggestValues(req.body);

    return res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

exports.suggestPrice = async (req, res, next) => {
  try {
    const result = await iaService.suggestValues(req.body);

    return res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

exports.predictMargin = async (req, res, next) => {
  try {
    const result = await iaService.predictMargin(req.body);

    return res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};