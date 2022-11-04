const express = require('express');
const blogData = require("./blog-service");
const multer = require("multer");
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const path = require("path");
const app = express();

const HTTP_PORT = process.env.PORT || 8080;

cloudinary.config({
    cloud_name: 'Cloud Name',
    api_key: 'API Key',
    api_secret: 'API Secret',
    secure: true
});

const upload = multer();

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.redirect("/about");
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, "/views/about.html"))
});

app.get('/blog', (req,res)=>{
    blogData.getPublishedPosts().then((data=>{
        res.json(data);
    })).catch(err=>{
        res.json({message: err});
    });
});

app.get('/posts', (req,res)=>{

    let queryPromise = null;

    if(req.query.category){
        queryPromise = blogData.getPostsByCategory(req.query.category);
    }else if(req.query.minDate){
        queryPromise = blogData.getPostsByMinDate(req.query.minDate);
    }else{
        queryPromise = blogData.getAllPosts()
    } 

    queryPromise.then(data=>{
        res.json(data);
    }).catch(err=>{
        res.json({message: err});
    })

});

app.post("/posts/add", upload.single("featureImage"), (req,res)=>{

    if(req.file){
        let streamUpload = (req) => {
            return new Promise((resolve, reject) => {
                let stream = cloudinary.uploader.upload_stream(
                    (error, result) => {
                        if (result) {
                            resolve(result);
                        } else {
                            reject(error);
                        }
                    }
                );
    
                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };
    
        async function upload(req) {
            let result = await streamUpload(req);
            console.log(result);
            return result;
        }
    
        upload(req).then((uploaded)=>{
            processPost(uploaded.url);
        });
    }else{
        processPost("");
    }

    function processPost(imageUrl){
        req.body.featureImage = imageUrl;

        blogData.addPost(req.body).then(post=>{
            res.redirect("/posts");
        }).catch(err=>{
            res.status(500).send(err);
        })
    }   
});

app.get('/posts/add', (req,res)=>{
   res.sendFile(path.join(__dirname, "/views/addPost.html"));
}); 

app.get('/post/:id', (req,res)=>{
    blogData.getPostById(req.params.id).then(data=>{
        res.json(data);
    }).catch(err=>{
        res.json({message: err});
    });
});

app.get('/categories', (req,res)=>{
    blogData.getCategories().then((data=>{
        res.json(data);
    })).catch(err=>{
        res.json({message: err});
    });
});

app.use((req,res)=>{
    res.status(404).send("404 - Page Not Found")
})

blogData.initialize().then(()=>{
    app.listen(HTTP_PORT, () => { 
        console.log('server listening on: ' + HTTP_PORT); 
    });
}).catch((err)=>{
    console.log(err);
})
