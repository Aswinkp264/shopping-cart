var express = require("express");
var router = express.Router();
var productHelper = require("../helpers/product-helpers");
var adminHelpers = require("../helpers/admin-helpers");
const serviceHelpers = require("../helpers/service-helpers");

const verifyAdmin = (req, res, next) => {
  if (req.session.adminLoggedIn) {
    next();
  } else {
    res.redirect("/admin/login");
  }
};

router.get("/login", (req, res) => {
  if (req.session.adminLoggedIn) {
    res.redirect("/admin");
  } else {
    res.render("admin/login", {
      layout: false,
      loginErr: req.session.adminLoginErr ? true : null,
    });
    req.session.adminLoginErr = false;
  }
});

router.post("/login", (req, res) => {
  const ADMIN_USERNAME = "admin";
  const ADMIN_PASSWORD = "admin123";

  if (
    req.body.username === ADMIN_USERNAME &&
    req.body.password === ADMIN_PASSWORD
  ) {
    req.session.adminLoggedIn = true;
    res.redirect("/admin");
  } else {
    req.session.adminLoginErr = true;
    res.redirect("/admin/login");
  }
});

router.get("/logout", (req, res) => {
  req.session.adminLoggedIn = false;
  res.redirect("/admin/login");
});

// 👈 CHANGED - now shows dashboard
router.get("/", verifyAdmin, function (req, res) {
  adminHelpers
    .getDashboardStats()
    .then((stats) => {
      res.render("admin/dashboard", {
        admin: true,
        stats,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error loading dashboard");
    });
});

// 👈 ADDED - products page now at /admin/products
router.get("/products", verifyAdmin, function (req, res) {
  productHelper
    .getAllProducts()
    .then((products) => {
      res.render("admin/view-products", {
        admin: true,
        products: products,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error loading products");
    });
});

router.get("/add-products", verifyAdmin, function (req, res) {
  res.render("admin/add-products", { admin: true });
});

router.post("/add-products", verifyAdmin, function (req, res) {
  productHelper
    .addProduct(req.body)
    .then((id) => {
      if (req.files && req.files.image) {
        let image = req.files.image;
        image.mv("./public/product-images/" + id + ".jpg", (err) => {
          if (err) {
            console.log("Image upload error:", err);
            return res.status(500).send("Image upload failed");
          }
          res.redirect("/admin/products");
        });
      } else {
        res.redirect("/admin/products");
      }
    })
    .catch((err) => {
      console.log("Product add error:", err);
      res.status(500).send("Error adding product");
    });
});

router.get("/delete-product/:id", verifyAdmin, (req, res) => {
  let proId = req.params.id;
  productHelper.deleteProduct(proId).then(() => {
    res.redirect("/admin/products");
  });
});

router.get("/edit-product/:id", verifyAdmin, (req, res) => {
  let proId = req.params.id;
  productHelper.getProductDetails(proId).then((product) => {
    res.render("admin/edit-product", {
      admin: true,
      product: product,
    });
  });
});

router.post("/edit-product/:id", verifyAdmin, (req, res) => {
  let proId = req.params.id;
  productHelper.updateProduct(proId, req.body).then(() => {
    if (req.files && req.files.image) {
      let image = req.files.image;
      image.mv("./public/product-images/" + proId + ".jpg");
    }
    res.redirect("/admin/products");
  });
});

router.get("/orders", verifyAdmin, (req, res) => {
  adminHelpers
    .getAllOrders()
    .then((orders) => {
      res.render("admin/orders", {
        admin: true,
        orders,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error loading orders");
    });
});

router.post("/update-order-status", verifyAdmin, (req, res) => {
  adminHelpers
    .updateOrderStatus(req.body.orderId, req.body.status)
    .then(() => {
      res.json({ status: true });
    })
    .catch((err) => {
      console.log(err);
      res.json({ status: false });
    });
});

router.get("/users", verifyAdmin, (req, res) => {
  adminHelpers
    .getAllUsers()
    .then((users) => {
      res.render("admin/users", {
        admin: true,
        users,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error loading users");
    });
});

router.get("/block-user/:id", verifyAdmin, (req, res) => {
  adminHelpers.blockUser(req.params.id).then(() => {
    res.redirect("/admin/users");
  });
});

router.get("/unblock-user/:id", verifyAdmin, (req, res) => {
  adminHelpers.unblockUser(req.params.id).then(() => {
    res.redirect("/admin/users");
  });
});
// ===============================
// SERVICE BOOKINGS
// ===============================

// VIEW ALL SERVICE BOOKINGS
router.get(
  "/service-bookings",
  verifyAdmin,
  async (req, res) => {

    try {

      let bookings =
        await serviceHelpers.getAllBookings();

      let serviceBookingCount =
        await serviceHelpers.getPendingBookingCount();

      res.render(
        "admin/service-bookings",
        {
          admin: true,
          bookings,
          serviceBookingCount
        }
      );

    } catch (err) {

      console.log(err);

      res.status(500).send(
        "Error loading service bookings"
      );
    }
  }
);

// VIEW SINGLE BOOKING DETAILS
router.get(
  "/service-booking/:id",
  verifyAdmin,
  async (req, res) => {

    try {

      let booking =
        await serviceHelpers.getBookingDetails(
          req.params.id
        );

      let serviceBookingCount =
        await serviceHelpers.getPendingBookingCount();

      res.render(
        "admin/service-booking-details",
        {
          admin: true,
          booking,
          serviceBookingCount
        }
      );

    } catch (err) {

      console.log(err);

      res.status(500).send(
        "Error loading booking details"
      );
    }
  }
);

// UPDATE SERVICE STATUS
router.post(
  "/update-service-status",
  verifyAdmin,
  async (req, res) => {

    try {

      await serviceHelpers.updateBookingStatus(

        req.body.bookingId,

        req.body.status,

        req.body.estimatedCost

      );

      res.json({
        status: true
      });

    } catch (err) {

      console.log(err);

      res.json({
        status: false
      });
    }
  }
);

module.exports = router;
