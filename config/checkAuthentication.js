module.exports = {
  // This function is check the req is Authenticated or not
  ensureAuthenticated: function (req, res, next) {


    if (req.isAuthenticated()) {

      // Check whether the user has permission to access this user's unique link
      if (req.params.customer_id) {
        if (req.user.customer_id == req.params.customer_id) {
          return next();
        } else {
          return res.render("redirect_page", {
            footer: true,
            title: "Unauthorized Access",
            style: "login-status-error"
          })
        }
      }
      return next();
    }
    return res.render("redirect_page", {
      footer: true,

      style: "login-status-error"
    })
  },

  ensureVanAuthenticated: function (req, res, next) {

    if (req.isAuthenticated()) {

      // Check whether the vendor has permission to access this link

      if (req.params.van_id) {
        if (req.user.van_id == req.params.van_id) {

          return next();
        } else {
          return res.render("redirect-page-vendor", {
            footer: true,
            errorMessage: "access denied, this page will redirect to login in 3s."
          })
        }
      }

      return next();

    }
    return res.render("redirect-page-vendor", {
      footer: true,
      errorMessage: "Please log in to get access, this page will redirect to login in 3s."
    })
  }

};