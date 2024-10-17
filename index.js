import express from "express"
import {google} from "googleapis"
import cors from "cors"
import dotenv from "dotenv"
import pg from "pg"
dotenv.config()
const app=express();
const host = process.env.PGHOST;
const port1 = process.env.PGPORT;
const user = process.env.PGUSER;
const password = process.env.PGPASSWORD;
const database = process.env.PGDATABASE;
const connectionString = `postgresql://${user}:${password}@${host}:${port1}/${database}`;
const port=process.env.PORT||3000
const db=new pg.Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
})
const corsOptions = {
    origin: '*', // Allow all origins
  };
  app.use(cors(corsOptions));
db.connect();
app.use(express.json())
app.listen(port,(req,res)=>{
    console.log("Working")
})
app.get("/",(req,res)=>{
    res.send("successfull")
})
app.get("/fetch",async(req,res)=>{
    try{
        const response=await db.query("select * from meet_owners");
        console.log(response.rows)
        res.send(response.rows);
    }
    catch(err){
        console.log(err);
        res.send({});
    }
})
// app.post("/meet",async (req,res)=>{
//         try{
//             const result=await db.query("select meet from conn where mentor_id=$1 and mentee_id=$2",[req.user.mid,req.body.mid]);
//             const data=result.rows[0];
//             if(data.meet=="" || data.meet==null){
//               res.render("meet.ejs",{mid:req.body.mid});
//              }
//             else{
//               res.redirect(data.meet);
//             }
//           }
//         catch(err){
//           console.log(err.message);
//           res.redirect("/home");
//         }
// })
const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const REDIRECT_URL =process.env.REDIRECT_URL
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URL
);
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});
app.post('/auth', async (req, res) => {
      res.send(url)
}
);
app.post("/meet",async (req,res)=>{
    try{
        const response=await db.query("SELECT meet from meet_owners where username=$1",[req.body.user])
        console.log(response.rows[0]);
        if(response.rowCount==0){
            res.send("")
        }
        else{
            console.log("Hello theer")
            res.send(response.rows[0].meet);
        }
    }
    catch(err){
        res.send('')
    }
})
app.post('/generatelink', async (req, res) => {
  const code = req.body.code;
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  const link=await createMeetLink();
  console.log(link)
  //save link the database
  try{
  await db.query("insert into meet_owners values($1,$2,$3)",[req.body.user,link,req.body.details])}
  catch(err){console.log(err)}
  res.send(link)
});
async function createMeetLink() {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const event = {
    summary: 'Sample Meeting',
    description: 'A chance to hear more about Google Meet API',
    start: {
      dateTime: '2024-10-01T10:00:00-07:00',
      timeZone: 'America/Los_Angeles',
    },
    end: {
      dateTime: '2024-10-01T10:30:00-07:00',
      timeZone: 'America/Los_Angeles',
    },
    conferenceData: {
      createRequest: {
        requestId: 'sample-request-id',
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    },
    reminders: {
      useDefault: true,
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1,
    });

    const meetLink = response.data.conferenceData.entryPoints[0].uri;
    return meetLink
  } catch (error) {
    console.error('Error creating event:', error);
    return null;
  }
}
app.get("/petition",async (req,res)=>{
    // const user=req.body.user;

    try{
        const response2=await db.query("select pid,header,description from petitions")
        console.log(response2.rows);
        res.send({counts:response2.rows});
    }
    catch(err){
        console.log(err.message)
        res.send({})
    }
})
app.post("/commmit",async(req,res)=>{
    const data=req.body;
    const response2=await db.query("insert into petition_relation values($1,$2)",[data.user,data.pid])
})