const express = require ('express');
const bodyParser = require('body-parser');
const graphqlHttp = require('express-graphql');
const { buildSchema }= require('graphql');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require ('jsonwebtoken');


const Event = require('./models/event');
const User = require('./models/user');

const app = express();

// Allow cross-origin
app.use(cors());

app.use(bodyParser.json());


app.use('/graphql', graphqlHttp({
    schema: buildSchema(`
        type Event {
            _id: ID!
            date: String!
            cpu_usage: Float
            cpu_temp: Int
        }

        type User {
            _id: ID!
            email: String!
            password: String
        }

        type AuthData {
            userId: ID!
            token: String!
            tokenExpiration: Int!
        }

        input EventInput {
            date: String!
            cpu_usage: String
            cpu_temp: String
        }

        input UserInput {
            email: String!
            password: String!
        }

        type RootQuery {
            cpuData: [Event!]!
            login(email: String!, password: String!): AuthData!
        }

        type RootMutation {
            createEvent(eventInput: EventInput): Event
            createUser(userInput: UserInput): User
        }

        schema {
            query: RootQuery
            mutation: RootMutation
        }
    `),
    rootValue: {
        cpuData: () => {
            return Event.find()
            .then(cpuData =>{
                return cpuData.map(event => {
                    return {...event._doc, _id: event.id};
                });
            })
            .catch(err => {
                throw err;
            });
        },
        createEvent: args => {
            const event = new Event({
                date: new Date(args.eventInput.date),
                cpu_usage: args.eventInput.cpu_usage,
                cpu_temp: args.eventInput.cpu_temp,
                
            });
            return event
            .save()
            .then(result => {
                return {...result._doc, _id: result._doc._id.toString()};
            })
            .catch(err => {
                console.log(err);
                throw err;
            });
            
        },
        createUser: args => {
            return User.findOne({email: args.userInput.email})
            .then(user => {
                if (user) {
                    throw new Error('User already exists')
                }
                return bcrypt.hash(args.userInput.password, 12)
            })
            .then(hashedPassword => {
                const user = new User({
                    email: args.userInput.email,
                    password: hashedPassword
                });
                return user.save();
            })
            .then(result => {
                return { ...result._doc, password: null, _id: result.id };
            })
            .catch(err =>{
                throw err;
            });
        },
        login: async ({ email, password }) => {
            const user = await User.findOne({  email: email  });
            if(!user) {
                throw new Error('User does not exist!');
            }
            const isEqual = await bcrypt.compare(password, user.password);
            if(!isEqual) {
                throw new Error('Password is incorrect!');
            }
            const token = jwt.sign({ userId: user.id, email: user.email }, 
                'jokurandomavain', 
                {
                    expiresIn: '1h'
                });
                return { userId:user.id, token: token, tokenExpiration: 1 };
                
        }
    },
    graphiql:true
}));

mongoose.connect(`mongodb+srv://${process.env.MONGO_USER}:${
    process.env.MONGO_PASSWORD
}@cluster0-jwyls.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`
).then(()=>{
    app.listen(8000);
}).catch(err => {
    console.log(err);
});

