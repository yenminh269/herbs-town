import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import multer from "multer";
import path from "path";
import { fileURLToPath } from 'url';
import fs from "fs";

const app = new express();
const port = 3000;
const API_URL = "http://localhost:4000";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname,'/uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
})
const upload = multer({ storage: storage })

let herb;

//Render the main page
app.get("/", async (req, res) => {
    try{
        const response = await axios.get(`${API_URL}/all`);
        res.render("home.ejs", { herbs: response.data });
    }catch(error){
        console.error(error);
        res.status(500).json("Error fetching items");
    }
})

//Render the add photo page
app.get("/add", (req, res) => {
    res.render("add.ejs");
})

//Get the uploaded item
app.post("/upload", upload.single('image'), async (req, res) => {
    const data = {
        ...req.body,
        fileName: req.file.originalname,
        path: req.file.path
    }
    try{
        await axios.post(`${API_URL}/add`, data);
        res.redirect("/");
    }catch(error){
        console.error(error);
        res.status(500).json("Error uploading item");
    }
})

//Route to render a specific item
app.get("/herbs/:id", async (req, res) => {
    try{
        const response = await axios.get(`${API_URL}/herbs/${req.params.id}`);
        herb = response.data;
         if(herb.traits.length == 0){
            res.render("index.ejs", { 
                itemSelected: herb,
                isBlank: true
            })
        } else{
            res.render("index.ejs", { itemSelected: herb });
        }
    }catch(error){
        console.error(error.message);
        res.status(500).json("Error fetching item");
    }
})

//Route to render the edit page
app.get("/edit/:id/:index", (req, res) =>{
    try {
        res.render("index.ejs", { 
            submit: "Update Post",
            edit: true,
            itemSelected: herb,
            index: req.params.index
        })
    } catch(err){
        console.error(err.message);
        res.status(500).json("Error fetching post");
    }
})

// Route to update a specific item
app.post("/api/posts/:id/:index", async (req, res) => {
    try {
        const response = await axios.patch(`${API_URL}/herbs/${req.params.id}/${req.params.index}`, req.body);
        herb = response.data;
        res.render("index.ejs", { itemSelected: herb });
    } catch(error){
        console.error(error.message);
        res.status(500).json("Error updating item");
    }
})

//Route to render the add traits page
app.get("/add/:id", (req, res) => {
    try {
        res.render("index.ejs", {
            submit: "Create Post",
            itemSelected: herb,
            edit: false
    })
    } catch(err){
        console.error(err.message);
        res.status(500).json("Error fetching post");
    }
})

//Route to add a new property for an item
app.post("/posts/:id&:length", async (req, res) => {
    try {
        const response = await axios.post(`${API_URL}/herbs/${req.params.id}&${req.params.length}`, req.body);
        herb = response.data;
        res.render("index.ejs", { itemSelected: herb });
    } catch(error){
        console.log(error.message);
        res.status(500).json("Error creating a trait");
    }
})

//Route to delete a property of an item
app.get("/posts/delete/:id/:index", async (req, res) => {
    try {
        const response = await axios.delete(`${API_URL}/herbs/${req.params.id}/${req.params.index}`);
        herb = response.data;
        if(herb.traits.length == 0){
            res.render("index.ejs", { 
                itemSelected: herb,
                isBlank: true
            })
        } else{
            res.render("index.ejs", { itemSelected: herb });
        }
    } catch(error){
        console.log(error.message);
        res.staus(500).json("Error deleting a trait");
    }
})

//Route to delete an item
app.get("/delete/:id/:path", async (req, res) => {
    try{
        await axios.delete(`${API_URL}/${req.params.id}`);
        fs.access(path.join(__dirname,'/uploads', req.params.path), fs.constants.F_OK, (err) => {
        if (!err) {
            fs.unlink(path.join(__dirname,'/uploads', req.params.path), (unlinkErr) => {
            if (unlinkErr) {
                console.error("Failed to delete:", unlinkErr);
            } else {
                console.log("File deleted.");
            }
            });
        } else {
            console.log("File does not exist.");
        }
        });
        res.redirect("/");
    } catch(error){
        console.log(error.message);
        res.staus(500).json("Error deleting item");
    }
})

app.listen(port, () => {
    console.log("API is listening on port " + port);
})