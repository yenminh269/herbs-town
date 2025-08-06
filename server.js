import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";

const app = new express();
const port = 4000;
env.config();

const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT
});
db.connect();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));

let no_herb;
let no_trait;
let item = {};

async function getItem(id){
    const isEmpty = await db.query(`SELECT * FROM traits WHERE herb = $1;`, [id]);
    if(+isEmpty.rows.length != 0){
        const response = await db.query(
            `SELECT herb.id, herb.name, herb.path, traits.title, traits.content, traits.day
            FROM herb
            JOIN traits 
            ON herb.id = $1 AND traits.herb = $1
            ORDER BY trait_pos ASC;`, [id]);
        item = {
            id: response.rows[0].id,
            name:  response.rows[0].name,
            path: response.rows[0].path,
            traits: response.rows
        }
    } else { 
        const response = await db.query(`SELECT * FROM herb WHERE id = $1;`, [id]);
        item = {
            id: response.rows[0].id,
            name:  response.rows[0].name,
            path: response.rows[0].path,
            traits: []
        }
    }
    return item;
}

//GET all items
app.get("/all", async (req, res) => {
    try{
        const response = await db.query(`SELECT * FROM herb;`);
        res.json(response.rows);
    }catch(error){
        res.status(404).json({error: "Error fetching data from database"});
    }
})

//ADD a new item
app.post("/add", async (req, res) => {
    try {
        let result = await db.query(`SELECT COUNT(*) AS total_rows FROM herb;`);
        no_herb = +result.rows[0].total_rows + 1;
        await db.query("INSERT INTO herb VALUES ($1, $2, $3);", [no_herb, req.body.name, req.body.fileName]);
        res.json('Successfully insert data to database');
    }catch(error){
        res.status(404).json({error: "Error inserting data to database"});
    }
})

//GET a specific item
app.get("/herbs/:id", async (req, res) => {
    try {
        let id = +req.params.id;
        const item = await getItem(id);
        res.json(item);
    }catch(error){
        res.status(404).json({error: "Error fetching data from database"});
    }
})

//UPDATE a specific trait of a item
app.patch("/herbs/:id/:index", async (req, res) => {
    try {
        let trait_pos = +req.params.index + 1;;
        await db.query(
            `UPDATE traits
            SET title = $1 ,
            content = $2,
            day = $3
            WHERE herb = $4 AND trait_pos = $5;`,
            [req.body.title, req.body.content, new Date().toDateString(), req.params.id, trait_pos]);
        let id = +req.params.id
        const item = await getItem(id);
        res.json(item);
    } catch(error){
        res.status(404).json({error: "Error fetching data from database"});
    }
})

//ADD a new trait for a specific item by index
app.post("/herbs/:id&:length", async (req, res) => {
    try {
        let id = +req.params.id;
        let trait_pos = +req.params.length + 1;
        let result = await db.query(`SELECT COUNT(*) AS total_rows FROM traits;`);
        no_trait = +result.rows[0].total_rows + 1;
        await db.query(`INSERT INTO traits 
            VALUES ($1, $2, $3, $4, $5, $6)`, 
            [no_trait, req.body.title, req.body.content, new Date().toDateString(), id, trait_pos]);
        const item = await getItem(id);
        res.json(item);
    } catch(error){
        res.status(404).json({error: "Error fetching data from database"});
    }
})

//DELETE a trait for a specific item by id
app.delete("/herbs/:id/:index", async (req, res) => {
    try {
        let id = +req.params.id;
        let trait_pos = +req.params.index + 1;
        await db.query(`DELETE FROM traits WHERE herb = $1 AND trait_pos = $2`, [id, trait_pos]);
        const item = await getItem(id);
        res.json(item);
    }catch(error){
        res.status(404).json({error: "Error fetching data from database"});
    }
})

//DELETE an item
app.delete("/:id", async (req, res) => {
    try {
        let id = +req.params.id;
        await db.query(`DELETE FROM herb WHERE id = $1`, [id]);
        await db.query(`DELETE FROM traits WHERE herb = $1`, [id]);
        res.json({message: `Sucessfully deleted data from database`});
    }catch(error){
        res.status(404).json({error: "Error fetching data from database"});
    }
})

app.listen(port, () => {
    console.log("Server is listening on port: " + port);
})