var express         = require('express'),
    app             = express(),
    bodyParser      = require('body-parser'),
    bl              = require('bl'),
    https           = require('https'),
    methrodOverride = require('method-override'),
    mongoose        = require('mongoose'),
    
    passport        = require('passport'),
    LocalStrategy   = require('passport-local'),
    expressSession  = require('express-session'),
    
    User            = require('./models/user'),
    Location        = require('./models/location'),
    
    indexRoutes     = require('./routes/index');
    

// mongoose.connect('mongodb://localhost/nightlife');    
mongoose.connect('mongodb://' + MADE_WITH + ':' + SECRET + '@ds259499.mlab.com:59499/freecodecamp-playground');
    
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/public'));

app.use(methrodOverride('_method'));


app.use(expressSession({
    secret: "The automibile as an individual commodity and a modality in its system is a functionless metal box and a blight on society",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    next();
});







app.get('/', function (req, res) {
    res.render("index");
});

app.get('/secret', isLoggedIn, function (req, res) {
    res.render('auth_test');
});

app.get('/header', function (req, res) {
    console.log(req.session.backURL);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(req.header('Referer')));
})

app.post('/search', function (req, res) {
    res.redirect('/search/' + req.body.locationSearch);
});

app.get('/react', function (req, res) {
    res.render("reactTest");
});

app.post('/location', function (req, res) {
    console.log("Post to /location: ");
    console.log(req.body);
    res.redirect('back')
});

app.post('/location/:name', isLoggedIn, function (req, res) {
    console.log("### Post to /location/name: ");
    console.log(req.params.name);
    console.log("### ...body: ");
    console.log(req.body);
    console.log("### place_id: ");
    console.log(req.body.place_id);
    
    
    User.findById(req.user._id, function (err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            console.log("User attempting to add an item");
            console.log(foundUser);
            
            Location.find({
                placeid: req.body.place_id
            }, function (err, foundLocation) {
                if (err) {
                    console.log(err);
                } else {
                    
                    console.log("Location lookup: ", foundLocation);
                    if (foundLocation[0]) {
                        console.log("location already in db");
                        console.log("Adding: ", foundUser.username, " to: ", foundLocation[0].placename);
                        var isInArray = foundLocation[0].usersGoing.some(function (each) {
                            return each.equals(foundUser._id);
                        });
                        console.log("IS IN ARRAY: " + isInArray.toString());
                        if (isInArray) {
                            console.log("User is already registered as going, removing them now...");
                            foundLocation[0].usersGoing.remove(foundUser._id);
                            foundLocation[0].save();
                            console.log(foundLocation[0]);
                        } else {
                            console.log("User has NOT registered interest, adding them now...");
                            foundLocation[0].usersGoing.push(foundUser._id);
                            foundLocation[0].save();
                        }
                        console.log("Found location: ");
                        console.log(foundLocation[0]);
                        res.redirect('back');
                    } else {
                        console.log("Location not in db, adding it...");
                        var placename = req.params.name;
                        var placeid = req.body.place_id;
                        
                        console.log(placename, placeid);
                        
                        var newLocation = {
                            placename: placename,
                            placeid: placeid
                        };
                        
                        Location.create(newLocation, function (err, createdLocation) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log("Create location sucessfull!");
                                console.log(createdLocation);
                                console.log("Adding: ", foundUser.username, " to: ", createdLocation.placename);
                                createdLocation.usersGoing.push(foundUser._id);
                                createdLocation.save();
                                console.log(createdLocation);
                                res.redirect('back');
                            }
                        });
                    }
                }
            })
            
        }
    });
    
});

app.get('/search/:searchterm', function (req, res) {
    var geocoderUrl = "https://api.opencagedata.com/geocode/v1/json?q=" + req.params.searchterm + "&key=0565928785864518b7f5d0bc5b607205&language=en&pretty=1";
    
    req.session.returnTo = '/search/' + req.params.searchterm;
    // console.log(req.session.returnTo);
    
    https.get(geocoderUrl, function (codeResponce) {
        codeResponce.pipe(bl(function (err, codeData) {
            if (err) throw err;
            
            var parsedData = JSON.parse(codeData.toString());
            var lat  = parsedData.results[0].geometry.lat,
                long = parsedData.results[0].geometry.lng;
                
            var mapsUrl = "https://maps.googleapis.com/maps/api/place/autocomplete/json?input=Bar&types=establishment&location=" + lat + "," + long + "&radius=3000&key=AIzaSyA5vtIbo07AG10AbpSJjRd69lP9GaUZzTU";
            var otherMap = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=" + lat + "," + long + "&radius=3000&type=bar&keyword=nightlife&key=AIzaSyA5vtIbo07AG10AbpSJjRd69lP9GaUZzTU";
            
            https.get(otherMap, function (mapResponce) {
                mapResponce.pipe(bl(function (err, mapData) {
                    if (err) {
                        console.err(err);
                    };
                    
                    Location.find({}, function (err, foundLocations) {
                        if (err) {
                            console.log(err);
                        } else {
                            
                            var mapParse = JSON.parse(mapData.toString());
                            
                            if (mapParse.status == "OVER_QUERY_LIMIT") {
                                res.setHeader('Content-Type', 'application/json');
                                res.send(JSON.stringify(mapParse));
                            } else {
                                res.render('bars/index', {
                                    searchData: mapParse.results,
                                    locationData: foundLocations
                                }); 
                            }
                        }
                    })
                }));
            });
            // res.send('help');
        }));
    });
});


//========== AUTH routes ================

app.get('/register', function (req, res) {
    res.render('user/register');
});

app.post('/register', function (req, res) {
    var newUser = new User({username: req.body.username});
    User.register(newUser, req.body.password, function (err, user) {
        if (err) {
            console.error(err);
            res.redirect('/');
        }
        passport.authenticate('local')(req, res, function () {
            console.log("Added new user: ", user);
            res.redirect(req.session.returnTo || '/');
        });
    });
});


app.get('/login', function (req, res) {
    res.render('user/login');
});

app.post('/login', passport.authenticate('local', {
    successReturnToOrRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}), function (req, res) {});


app.get('/logout', function (req, res) {
    req.logOut();
    res.redirect('/');
});

app.get('/user/:username', function (req, res) {
    User.find({
        username: req.params.username
    }, function (err, foundUser) {
        if (err) throw err;
        res.render('user/show', {user: foundUser[0]});
    });
});



app.listen(process.env.PORT, function () {
    console.log("Server initialising...");
});










function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()){
        return next();
    }
    req.session.returnTo = req.header('Referer');
    console.log(req.header('Referer'));
    res.redirect('/login');
}








var dataRes = [
    {
        "geometry": {
            "location": {
                "lat": 51.510896,
                "lng": -0.129072
            },
            "viewport": {
                "northeast": {
                    "lat": 51.51230192989271,
                    "lng": -0.1274554701072778
                },
                "southwest": {
                    "lat": 51.50960227010727,
                    "lng": -0.1301551298927222
                }
            }
        },
        "icon": "https://maps.gstatic.com/mapfiles/place_api/icons/bar-71.png",
        "id": "62d922133a23a7458a94d36b8a5d9b5db8f0c475",
        "name": "Zoo Bar & Club",
        "opening_hours": {
            "open_now": false,
            "weekday_text": []
        },
        "photos": [
            {
                "height": 399,
                "html_attributions": [
                    "<a href=\"https://maps.google.com/maps/contrib/113719639442868633401/photos\">Ashley Hughes</a>"
                ],
                "photo_reference": "CmRaAAAAoZVUu3x403muvrbLkvPiE-6VDwL7rRS2Cfrb6YE9WYdjtWbfn_IRvIAV95Q7YVhELrtPgrRAK7VSQ5yMY-TONXIBZZ5IQQ9sibPd0LD4NvCK8_OpbmT_NLkfNHhLFpAhEhBQfOdog6JOYjVwYiq4BQeYGhSjEHyqmnQOc9Z1H_NPNj2cqRwbFQ",
                "width": 600
            }
        ],
        "place_id": "ChIJm8X-9M0EdkgR7OfNHW6yApM",
        "rating": 3.6,
        "reference": "CmRbAAAAinhlbs3CSGca_xp_9294OmmE6VxUvhN1EGFAAUGhAgTp9hwo9BnMDQ6KNVt7XsKrQKJ9YDVH_8VLHv7YEeL3OgadgQajSKQ9hXH6EPUXEGUdDjav6QN0upe_MH1AU9zWEhArwBmg-wtAFGFPhzQXWWJuGhTB6UwTNVnnWiYTZ9pmkJgl1P3-nw",
        "scope": "GOOGLE",
        "types": [
            "night_club",
            "bar",
            "point_of_interest",
            "establishment"
        ],
        "vicinity": "Leicester Square, 13-17 Bear St, London"
    }
];


var limitError = { 
    error_message: 'You have exceeded your daily request quota for this API.',
    html_attributions: [],
    results: [],
    status: 'OVER_QUERY_LIMIT' 
}
