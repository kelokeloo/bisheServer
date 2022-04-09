// const { ObjectID } = require('bson');
var express = require('express');
var router = express.Router();

const jwt = require('jsonwebtoken')

// mongodb client instance
const { client, dbName } = require('../db/common')
const  ObjectId = require('mongodb').ObjectId

const ACCESS_TOKEN_SECRET='swsh23hjddnns'
const ACCESS_TOKEN_LIFE=1200000

function createToken(username) {

  const payload = {
    username,
  }
  
  const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    algorithm: "HS256",
    expiresIn: ACCESS_TOKEN_LIFE
  })
  return accessToken
}

const verifyToken = function(token) {
  if(token === '' || token === undefined) return false
  const accessToken = token;
  

  try {
    jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
    return true
  } catch (error) {
    console.log(error);
    return false;
  }
}

function verifyTokenFromRequest(req, res){
  const token = req.headers.authorization?? '';
  if(!verifyToken(token)){
    console.log('非法token')
    res.send({
      code: 401,
      msg: '非法token'
    })
    return false
  }
  return true
}


// connect test 

router.get('/test', (req, res, next)=>{
  if(!verifyTokenFromRequest(req, res)) return

  res.send({
    code: 200,
    msg: '合法'
  })
  
  
})






/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// handpick

router.get('/handpick', async function(req, res, next){
  const data = await new Promise((resolve, reject)=>{
    client.connect((err)=>{
      if(err){
        console.log(err);
       reject(err)
      }
      const db = client.db(dbName)
      // mongodb语句
      const data = db.collection('handpick').find({}).toArray();
      resolve(data)
    })
  })
  
  res.send({
    code: 200,
    data: data
  })
})




// music 
router.get('/music/:id', async (req, res)=>{
  const musicId = req.params.id
  console.log('musicId', musicId)
  // 拿到用户id
  const userID = req.headers.userid?? '';
  console.log(userID)
  const data = await new Promise((resolve, reject)=>{
    client.connect((err)=>{
      if(err){
        console.log(err);
       reject(err)
      }
      const db = client.db(dbName)
      // 根据音乐id查找指定音乐
      const result = db.collection('music').find({id:`${musicId}`}).toArray()
      resolve(result)
    })
  })
  res.send({
    code: 200,
    data: data[0]
  })
})
// music mark
router.get('/musicMark/:id', (req, res)=>{
  const musicId = req.params.id
  // 拿到用户id
  const userID = req.headers.userid?? '';
  // 添加到用户最近收听的音乐歌单
  // 找到对应用户的歌单id
  client.connect((err)=>{
    const db = client.db(dbName)

    new Promise((resolve, reject)=>{
      // 获取用户最近收听的音乐对应的歌单id
      db.collection('user').findOne({_id: ObjectId(userID)},(err, result)=>{
        if(err) return Promise.reject(err)
        // console.log('用户信息', result)
        const albumID = result.recent.recentMusicAlbum
        console.log('albumID', albumID)
        resolve(albumID)
      })
    })
    .then(albumID=>{
      // 根据albumID拿到最近收听的音乐数组
      return new Promise((resolve, reject)=>{
        db.collection('album').findOne({id: albumID}, (err, result)=>{
          if(err) return Promise.reject(err)
          resolve({albumID, musicList:result.musicList})
        })
      })
    })
    .then(({albumID, musicList})=>{
      // 添加当前音乐到音乐列表数组前面
      console.log('curMusicList', musicList)
      const musicIndex = musicList.findIndex(item=>item === musicId)
      if(musicIndex !== -1){ // 如果音乐已经在音乐数组中，先删除再插入数组开头
        musicList.splice(musicIndex, 1)
      }
      musicList.unshift(musicId)
      // 将修改同步到数据库
      db.collection('album').updateOne({id: albumID}, {$set:{musicList: musicList}},(err, result)=>{
        // console.log(result)
      })
    })
    .catch(err=>{
      console.error(err)
    })
  })
  res.send({
    code: 200,
    msg: 'success'
  })
})


// album 
router.get('/album/:id', async (req, res)=>{
  const albumId = req.params.id
  // 拿到用户id
  const userID = req.headers.userid?? '';
  const data = await new Promise((resolve, reject)=>{
    client.connect((err)=>{
      if(err){
        console.log(err);
       reject(err)
      }
      const db = client.db(dbName)
      // 根据albumID找到指定的歌单信息
      const result = db.collection('album').find({id:`${albumId}`}).toArray()
      
      resolve(result)
    })
  })
  res.send({
    code: 200,
    data: data[0]
  })
})

// album mark
router.get('/albumMark/:id', (req, res)=>{
  const albumId = req.params.id
  // 拿到用户id
  const userID = req.headers.userid?? '';
  client.connect((err)=>{
    if(err){
      console.log(err);
      return;
    }
    // 将歌单添加到用户最近收听的歌单
    const db = client.db(dbName)
    new Promise((resolve, reject)=>{
      // 获取用户信息
      db.collection('user').findOne({_id: ObjectId(userID)},(err, result)=>{
        if(err) return Promise.reject(err)
        console.log('用户信息', result)
        const albumList = result.recent.albumList
        resolve(albumList)
      })
    })
    .then(albumList=>{
      // 将当前歌单添加到albumList
      const albumIndex = albumList.findIndex(item=>item === albumId)
      if(albumIndex !== -1){ // 如果音乐已经在音乐数组中，先删除再插入数组开头
        albumList.splice(albumIndex, 1)
      }
      albumList.unshift(albumId)
      // 将修改同步到数据库
      db.collection('user').updateOne({_id: ObjectId(userID)}, {$set:{"recent.albumList": albumList}},(err, result)=>{
        console.log('update result', result)
      })
      console.log('albumList', albumList)
    })
    .catch(err=>{
      console.log(err)
    })
  })
  res.send({
    code: 200,
    msg: '标记成功'
  })
})

// range
router.get('/range', async (req, res)=>{
  res.send({
    code: 200,
    musicList: ['1', '2', '3', '4', '5']
  })
})


// login

router.post('/login', async (req, res)=>{
  const { username, password} = req.body
  // 判断账号密码是否正确
  const data = await new Promise((resolve, reject)=>{
    client.connect((err)=>{
      if(err){
        console.log(err);
       reject(err)
      }
      const db = client.db(dbName)
      // mongodb语句
      const data = db.collection('user').find({username}).toArray()
      resolve(data)
    })
  })
  if(data.length){  
    const info = data[0]
    if(password === info.password){
      // do nothing here
    }
    else{
      res.send({
        code: 201,
        msg: '账号或密码错误'
      })
      return 
    }

  }
  else {
    res.send({
      code: 201,
      msg: '非法用户'
    })
    return 
  }


  // 生成token
  const accessToken = createToken(username)
  
  res.send({
    code: 200,
    data: {
      token: accessToken,
      userID: data[0]._id
    }
  })
})

// recent 

router.get('/recent', (req, res)=>{
  if(!verifyTokenFromRequest(req, res)) {
    res.send({
      code: 401,
      msg: '非法token'
    })
    return 
  }
  const userID = req.headers.userid?? '';
  // 获取用户最近的音乐和歌单
  new Promise((resolve, reject)=>{
    client.connect((err)=>{
      if(err){
        console.log(err);
       reject(err)
      }
      const db = client.db(dbName)
      db.collection('user').findOne({"_id": ObjectId(userID)}, (err, res)=>{
        resolve(res)
      })
    })
  })
  .then(data=>{
    res.send({
      code: 0,
      msg: `${data.username} 的 最近收听歌曲和歌单`,
      data: {
        recentMusicAlbum: data.recent.recentMusicAlbum,
        albumList: data.recent.albumList
      }
    })
  })


  
})


module.exports = router;
