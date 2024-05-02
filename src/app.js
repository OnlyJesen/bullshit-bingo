const express = require('express');
const app = express();
const { Server } = require("socket.io");
const server = require('http').createServer(app);
const io = new Server(server);

app.set("view engine", "ejs");
app.use(express.static('public'));
app.get('/', (req, res) => { res.render('index'); });
//-------------------------------------------------------------------------------------------//

// Used to store the clients IPs while they are connect, so votes and IPs are connected
const connectedClients = [];
var isBingo = false;
// Stores the fields that are really selected and not just on vote
const finalSelectedFields = [];
// The opposite of finalSelectedFields, it stores the fields that get voted on
const voteSelectedFields = [];
// The vote count sent to the client
var clientVoteSelectedFields = [];
// Defines which bingo case
var bingoIndex = [];
var requiredPeople = 3;
//-------------------------------------------------------------------------------------------//

io.on("connection", (socket) => {
    // Push IP into connectedClients
    if(connectedClients.includes(socket.handshake.address)) {
        socket.emit("alreadyConnected")
        socket.disconnect(true);
    }
    connectedClients.push(socket.handshake.address)
    
    // NEW CODE HERE
   
    function finalFieldsHandler() {
        voteSelectedFields.forEach((element) => {
            if(element.count.length >= requiredPeople) {
                finalSelectedFields.push(element.field)
            }
        });
    }
    
    
    function broadcastUpdate() {
        let requiredPeople = Math.ceil(connectedClients.length * 0.7);
        if(requiredPeople < 3) requiredPeople = 3;
        finalFieldsHandler();
        clientVoteSelectedFields = [];
        voteSelectedFields.forEach((element) => {
            clientVoteSelectedFields.push({ field: element.field, count: element.count.length })
        });
        bingoFinishHandler();
        console.log(voteSelectedFields)
        socket.emit('serverDataUpdate', { clientVoteSelectedFields: clientVoteSelectedFields, connectedClients: connectedClients.length, finalFields: finalSelectedFields, requiredPeople: requiredPeople, isBingo: isBingo, bingoIndex: bingoIndex })
    }

    broadcastUpdate();

    socket.on('clientDataUpdate', (data) => {
        voteSelectedFields.forEach((element) => {
            element.count.forEach((storedVotes) => {
                if(storedVotes == socket.handshake.address) {
                    element.count.splice(element.count.indexOf(socket.handshake.address))
                    if(element.count.length < 1) {
                        voteSelectedFields.splice(voteSelectedFields.indexOf(element))
                    }
                }
            })
        });
        if(data != null) {
            if(voteSelectedFields.length > 0) {
                voteSelectedFields.forEach((element) => {
                    if(element.field == data) {
                        element.count.push(socket.handshake.address)
                    } else {
                        voteSelectedFields.push({field: data, count: [socket.handshake.address]})
                    }
                });
            } else {
                voteSelectedFields.push({field: data, count: [socket.handshake.address]})
            }
        };
        broadcastUpdate();
    });

    function bingoFinishHandler() {
        let bingoCombinations = [
            [1,2,3,4,5],
            [6,7,8,9,10],
            [11,12,13,14,15],
            [16,17,18,19,20],
            [21,22,23,24,25],
            [1,6,11,16,21],
            [2,7,12,17,22],
            [3,8,13,18,23],
            [4,9,14,19,24],
            [5,10,15,20,25],
            [1,7,13,19,25],
            [5,9,13,17,21]
        ]
        let sortedFinalFields = finalSelectedFields.sort(function(a, b) {
            return a - b;
        });
        if(sortedFinalFields.length > 3) {
            bingoCombinations.forEach((element) => {
                if(sortedFinalFields.includes(element[0]) && sortedFinalFields.includes(element[1]) && sortedFinalFields.includes(element[2]) && sortedFinalFields.includes(element[3]) && sortedFinalFields.includes(element[4])) {
                    isBingo = true;
                    bingoIndex.push(bingoCombinations.indexOf(element));
                }
                if(bingoCombinations.indexOf(element) == 2 || bingoCombinations.indexOf(element) == 7 || bingoCombinations.indexOf(element) > 9) {
                    if(sortedFinalFields.includes(element[0]) && sortedFinalFields.includes(element[1]) && sortedFinalFields.includes(element[3]) && sortedFinalFields.includes(element[4])) {
                        isBingo = true;
                        bingoIndex.push(bingoCombinations.indexOf(element));
                    }
                }
            });
        }
    }

    // END NEW CODE

    socket.on('disconnect', () => {
        // Deletes IP of disconnected client
        connectedClients.splice(connectedClients.indexOf(socket.handshake.address))
        voteSelectedFields.forEach((element) => {
            element.count.forEach((storedVotes) => {
                if(storedVotes == socket.handshake.address) {
                    element.count.splice(element.count.indexOf(socket.handshake.address))
                    if(element.count.length < 1) {
                        voteSelectedFields.splice(voteSelectedFields.indexOf(element))
                    }
                }
            })
        });
    });
});

//-------------------------------------------------------------------------------------------//
const port = process.env.PORT || 8080;
server.listen(port, () => console.log("App running on http://localhost:" + port));