import passport from "passport";

const authController = {
  jwtAuth: (req, res, next) => {
    // Checks that the user is signed in - anyone logged in is let past
    passport.authenticate("jwt", { session: false }, (err, user, info) => {
      if (err || !user) {
        return res.status(401).json({
          success: false,
          message: "Not logged in",
          errors: err || info,
        });
      }
      req.user = user;
      next();
    })(req, res, next);
  },
};

export default authController;
