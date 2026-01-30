var express = require("express");
var router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  let Products = [
    {
      name: "samsung S25",
      category: "mobile",
      description: "256GB",
      image:
        "https://rukminim2.flixcart.com/image/480/640/xif0q/mobile/i/s/g/-original-imahgfmzraymrnrg.jpeg?q=90",
    },
    {
      name: "iphone 16",
      category: "mobile",
      description: "256GB",
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQwnjRu2piR1q7hR_dy4OVQsuY2aPXU8rOhpg&s",
    },
    {
      name: "Redmi Note7",
      category: "mobile",
      description: "256GB",
      image:
        "https://akm-img-a-in.tosshub.com/indiatoday/images/device/1766470430Xiaomi-17-Pro-specs-800x800_one_to_one.jpg?VersionId=79NoscaJncT12OFS0S0UtQGJoeA7TLPe",
    },
    {
      name: "vivo XT",
      category: "mobile",
      description: "256GB",
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRaCpF6yFKnKVUfA_PEiuQZQRQ5JAaYHOi0zA&s",
    },
  ];

  res.render("index", { Products, admin: false});
});

module.exports = router;
