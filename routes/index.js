// const { ObjectID } = require('bson');
var express = require('express');
var router = express.Router();


const path=require('path')

const jwt = require('jsonwebtoken')

const multer = require('multer');

let upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, path.resolve(__dirname, '../public/images/moment/'));
        },
        filename: function (req, file, cb) {
            console.log('file.originalname', file.originalname)
            var extname=file.originalname;
            file.id=(new Date().getTime())
            var changedName =file.id + '_' +  extname+'';
            cb(null, changedName);
        }
    })
});
//上传图片
router.post('/upload', upload.array('photos'), (req, res) => {
    let fileList = req.files;
    let content = req.body
    const filesName = fileList.map(file=>{
      return path.basename(file.path)
    })
    res.json({
        code: 200,
        imgList: filesName
    });
});











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

  console.log('userInfo', data[0])
  
  res.send({
    code: 200,
    data: {
      token: accessToken,
      userID: data[0]._id,
      username:  data[0].username,
      headIcon: data[0].headIcon
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

// search
router.get('/search/:type/:keyword', (req, res)=>{
  const type = req.params.type?? '';
  const keyword = req.params.keyword?? '';
  // 根据关键词和type 访问数据库拿到响应的数据
  // keyword: music album user
  new Promise((resolve, reject)=>{
    client.connect((err)=>{
      if(err){
        console.log(err);
       reject(err)
      }
      const db = client.db(dbName)
      
      let result = undefined
      // 根据不同类型查找不同的数据库
      switch (type) {
        case 'music':
          // 访问music数据库
          // 根据keyword找到指定的歌单信息
          result = db.collection(type).find({
            $or:[
              {name: new RegExp(keyword)}, 
              {singer: new RegExp(keyword)}
            ]
          }).toArray()
          resolve(result)
          break;
        case 'album':
          // 访问music数据库
          // 根据keyword找到指定的歌单信息
          result = db.collection(type).find({
            $or:[
              {title: new RegExp(keyword)}, 
              {content: new RegExp(keyword)}
            ]
          }).toArray()
          resolve(result)

          break;
        case 'user':
          // 访问user数据库
          // 根据keyword找到指定的歌单信息
          result = db.collection(type).find({
              username: new RegExp(keyword)
          }).toArray()
          resolve(result)
          break;
        default:
          break;
      }
    })
  })
  .then(data=>{
    console.log(data)
    let code = 200
    if(!data.length){
      code = 201
    }
    res.send({
      code: code,
      data: data
    })
    
  })
})

router.post('/focus', async (req, res)=>{
  const {id, state} = req.body
  const userID = req.headers.userid?? '';
  const data = await new Promise((Resolve, Reject)=>{
    client.connect((err)=>{
      if(err){
        console.log(err);
       reject(err)
      }
      console.log('数据库连接成功')
      const db = client.db(dbName)
      // 找到关注列表
      new Promise((resolve, reject)=>{
        db.collection('user').findOne({_id: ObjectId(userID)}, (err, result)=>{
          if(err) {
            reject(err)
            return
          }
          resolve(result.userFocusList)
        })
      })
      .then(userFocusList=>{
        // 判断是否已经在关注列表中
        const index = userFocusList.findIndex(item=>item===id)
        // 根据state进行处理
        if(state){ // 执行关注操作
          if(index !== -1) return Promise.reject({msg: '已经关注'})
          userFocusList.push(id)
          
        }
        else {
          if(index === -1) return Promise.reject({msg: '不在关注列表中'})
          // 从关注列表中移除
          userFocusList.splice(index, 1)
          
        }
        // 写入数据库
        db.collection('user').updateOne({_id: ObjectId(userID)}, {$set: {userFocusList: userFocusList}}, (err, result)=>{
          if(err) {
            console.log('修改失败')
            return
          }
          console.log('修改成功', result)
          Resolve({msg: '修改成功'})
          return Promise.resolve({msg: '修改成功'})
        })
      })
      .catch(e=>{
        Resolve({
          code: -1,
          msg: e
        })
      })
    })
  })
  


  res.send({
    code: 200, 
    msg: state ? '关注成功': '取消关注',
    data: {id, state, userID, data}
  })
})

// 用户关注列表
router.get('/focuslist', async (req, res)=>{
  const userID = req.headers.userid?? '';
  const data = await new Promise((resolve, reject)=>{
    client.connect((err)=>{
      if(err){
        console.log(err);
       reject(err)
      }
      console.log('数据库连接成功')
      const db = client.db(dbName)
      // 查询用户信息
      db.collection('user').findOne({_id: ObjectId(userID)}, (err, result)=>{
        resolve(result.userFocusList)
      })
    })
  })
  res.send({
    code: 200,
    data
  })
})

// 发布moment
router.post('/moment/publish', (req, res)=>{
  const userID = req.headers.userid?? '';
  const data = req.body
  let {content, imgList, time} = data;

  // moment
  const moment = {
    content,
    imgList,
    time,
    like: 0,
    comment: []
  }

  // 将数据写入数据库
  new Promise((resolve, reject)=>{
    console.log('??')
    client.connect((err)=>{
      if(err){
        console.log(err);
       reject(err)
      }
      const db = client.db(dbName)
      // 根据用户ID查询用户的动态列表
      db.collection('user').findOne({_id: ObjectId(userID)}, (err, result)=>{
        resolve(result.memoryList)
        client.close()
      })
    })
  })
  .then(memoryList=>{
    memoryList.push(moment)
    console.log('memoryList', memoryList)
    // 将修改写入数据库
    client.connect((err)=>{
      if(err){
        console.log(err);
       reject(err)
      }
      const db = client.db(dbName)
      // 根据用户ID查询用户的动态列表
      db.collection('user').updateOne({_id: ObjectId(userID)}, {$set:{memoryList}}, (err, result)=>{
        client.close()
        if(err) {
          return Promise.reject(err)
        }
        return Promise.resolve(result)
      })
    })
  })
  .then(result=>{
    console.log('result', result)
    res.send({
      code: 200,
      mse: '发布成功',
      moment: data,
      userID
    })
  })
  .catch(e=>{
    res.send({
      code: 201,
      msg: '发布失败',
      err: String(e)
    })
  })
})








module.exports = router;
