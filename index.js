const port = process.env.PORT || 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

app.use(express.json());
app.use(cors());

// Database Connection With MongoDB
mongoose.connect("mongodb+srv://ramdhanhadi:gailardia004@cluster0.4gruime.mongodb.net/e-commerce");

// API Creation

app.get("/", (req, res)=>{
    res.send("Express App is Running")
})

const corsOptions = {
  origin: [
    'https://website-telaga-ps-frontend-git-master-reymond-hadis-projects.vercel.app/',
    `http://localhost:${port}`
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Image Storage Engine

const storage = multer.diskStorage({
    destination: './upload/images',
    filename:(req,file,cb)=>{
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({storage:storage})

// Creating Upload Endpoint for images
app.use('/images', express.static('upload/images'))
app.post("/upload",upload.single('product'),(req, res)=>{
    res.json({
        success:1,
        image_url:`http://localhost:${port}/images/${req.file.filename}`
    })
})

// Schema for Creating Products

const Product = mongoose.model("Product", {
    id:{
        type: Number,
        required: true,
    },
    name:{
        type: String,
        required: true,
    },
    image:{
        type: String,
        required: true,
    },
    category:{
        type: String,
        required: true,
    },
    old_price:{
        type: Number,
        required: true,
    },
    new_price:{
        type: Number,
        required: true,
    },
    date:{
        type: Date,
        default:Date.now,
    },
    available:{
        type: Boolean,
        default: true,
    },
})

app.post('/addproduct', async (req, res)=>{
    let products = await Product.find({});
    let id;
    if(products.length>0) {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id+1;
    } else {
        id=1;
    }
    const product = new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,
    });
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success:true,
        name:req.body.name,
    })
})

// Creating API for Deleting Products

app.post('/removeproduct', async (req, res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    res.json({
        success: true,
        name: req.body.name,
    })
})

// Creating API for getting all products

app.get('/allproducts', async (req, res)=>{
    let products = await Product.find({});
    console.log("All Products Fetched");
    res.send(products);
})

// Schema Creating for User model

const Users = mongoose.model('Users', {
    name:{
        type: String,
        required: true
    },
    email:{
        type: String,
        unique: true,
        required: true
    },
    nohp:{
        type: String,
        required: true
    },
    password:{
        type: String,
        required: true
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    },
})

// Creating Endpoint for registering the user
app.post('/signup', async (req, res) => {
    
    let check = await Users.findOne({email:req.body.email});
    if(check) {
        return res.status(400).json({success:false, error:"Existing user found with same email address"})
    }
    let cart = {};
    for (let i = 0; i < 300; i++) {
        cart[i] = 0;
    }
    const user = new Users({
        name:req.body.username,
        email:req.body.email,
        nohp:req.body.nohp,
        password:req.body.password,
        cartData:cart,
    })

    await user.save();

    const data = {
        user:{
            id:user.id
        }
    }

    const token = jwt.sign(data, 'secret_ecom');
    res.json({success:true, token})
})

// Creating Endpoint for user login
app.post('/login', async (req, res) => {
    let user = await Users.findOne({email:req.body.email});
    if(user) {
        const passCompare = req.body.password === user.password;
        if(passCompare) {
            const data = {
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data, 'secret_ecom');
            res.json({success:true, token})
        } else {
        res.json({success:false, errors:"Wrong Password"})
        }
    } else {
        res.json({success:false, errors:"User not found"})
    }
})

// Creating Endpoint for new Collection Data
app.get('/newcollections', async (req, res) => {
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("NewCollection Fetched")
    res.send(newcollection);
})

// Creating Endpoint for popular products
app.get('/popular', async (req, res) => {
    let products = await Product.find({});
    let popular = products.slice(0,4);
    console.log("Popular Fetched");
    res.send(popular)
})

// Creating Middleware to fetch user
    const fetchUser = async (req, res, next) => {
        const token = req.header('auth-token');
        if (!token) {
            res.status(401).send({error:'Please authenticate using the valid token'})
        } else {
            try {
                const data = jwt.verify(token, 'secret_ecom');
                req.user = data.user;
                next();
            } catch (error) {
                res.status(401).send({error:'Please authenticate using the valid token'})
            }
        }
    }

// Creating Endpoint for adding products in cartdata
app.post('/addtocart', fetchUser, async (req, res) => {
    console.log("Added", req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Added")
})

// Creating Endpoint to remove product from cartData
app.post('/removefromcart', fetchUser, async (req, res) => {
    console.log("Removed", req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId] -= 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Removed")
})

// Creating Endpoint to get cartData
app.post('/getcart', fetchUser, async (req, res) => {
    console.log("GetCart");
    let userData = await Users.findOne({_id:req.user.id});
    res.json(userData.cartData);
})

// Creating Endpoint to Clear Cart
app.post('/clearcart', fetchUser, async (req, res) => {
    try {
        console.log("Clearing cart for user:", req.user.id);
        
        // Buat keranjang kosong dengan semua item 0
        const emptyCart = {};
        for (let i = 0; i <= 300; i++) {
            emptyCart[i] = 0;
        }
        
        // Update cartData pengguna di database
        const result = await Users.findByIdAndUpdate(
            req.user.id,
            { $set: { cartData: emptyCart } },
            { new: true }
        );
        
        if (!result) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }
        
        console.log("Cart cleared successfully");
        res.json({ 
            success: true,
            cartData: emptyCart
        });
    } catch (error) {
        console.error("Error clearing cart:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error" 
        });
    }
});

// Riwayat Transaksi
const Transaction = mongoose.model("Transaction", {
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    userPhone: { // Tambahkan field untuk nomor telepon
        type: String,
        required: true
    },
    items: [{
        productId: Number,
        name: String,
        quantity: Number,
        price: Number
    }],
    totalAmount: Number,
    bank: String,
    date: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        default: 'pending'
    }
});

// Endpoint untuk menyimpan transaksi
app.post('/create-transaction', fetchUser, async (req, res) => {
    try {
        const { items, totalAmount, bank } = req.body;
        
        // Dapatkan user data untuk mendapatkan nomor telepon
        const user = await Users.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        
        const transaction = new Transaction({
            userId: req.user.id,
            userPhone: user.nohp, // Simpan nomor telepon
            items,
            totalAmount,
            bank
        });
        
        await transaction.save();
        
        res.json({
            success: true,
            transactionId: transaction._id
        });
    } catch (error) {
        console.error("Error creating transaction:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

app.get('/get-transactions', fetchUser, async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: -1 });
        res.json({
            success: true,
            transactions
        });
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

app.post('/cancel-transaction', fetchUser, async (req, res) => {
    try {
        const { transactionId } = req.body;
        
        // Periksa apakah transaksi ada dan milik user
        const transaction = await Transaction.findOne({ 
            _id: transactionId, 
            userId: req.user.id 
        });
        
        if (!transaction) {
            return res.status(404).json({ 
                success: false, 
                message: "Transaksi tidak ditemukan" 
            });
        }
        
        // Hanya transaksi pending yang bisa dibatalkan
        if (transaction.status !== 'pending') {
            return res.status(400).json({ 
                success: false, 
                message: "Hanya transaksi pending yang dapat dibatalkan" 
            });
        }
        
        // Update status transaksi menjadi cancelled
        const result = await Transaction.findByIdAndUpdate(
            transactionId,
            { $set: { status: 'cancelled' } },
            { new: true }
        );
        
        res.json({ 
            success: true,
            message: "Transaksi berhasil dibatalkan",
            transaction: result
        });
    } catch (error) {
        console.error("Error cancelling transaction:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error" 
        });
    }
});

app.get('/alltransactions', async (req, res) => {
    try {
        const transactions = await Transaction.find({}).sort({ date: -1 });
        res.json({
            success: true,
            transactions
        });
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

app.post('/update-transaction-status', async (req, res) => {
    try {
        const { transactionId, status } = req.body;
        
        // Validasi status
        const validStatus = ['pending', 'processing', 'completed', 'cancelled'];
        if (!validStatus.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status"
            });
        }
        
        const updatedTransaction = await Transaction.findByIdAndUpdate(
            transactionId,
            { $set: { status } },
            { new: true }
        );
        
        if (!updatedTransaction) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found"
            });
        }
        
        res.json({
            success: true,
            transaction: updatedTransaction
        });
    } catch (error) {
        console.error("Error updating transaction status:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

app.get('/api/data', (req, res) => {
  res.json({ message: "Hello from backend!" });
});

app.listen(port, (error)=>{
    if (!error) {
        console.log("Server is running on Port " + port)
    } else {
        console.log("Error : " + error)
    }
})