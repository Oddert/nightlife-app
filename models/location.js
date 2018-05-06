var mongoose                = require('mongoose'),
    passportLocalMongoose   = require('passport-local-mongoose');
    
var LocationSchema = new mongoose.Schema({
    username: false,
    placename: String,
    placeid: String,
    usersGoing: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "NightlifeUser"
        }
    ]
});

LocationSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("NightlifeLocation", LocationSchema);