// const { ObjectID } = require('bson');
var express = require('express');
var router = express.Router();


const path=require('path')

const jwt = require('jsonwebtoken')
const moment = require('moment')

const {
  getUserInfo,
  getMusicById,
  getAllUserInfo,
  addOneUser,
  addOneAlbum,
  setUserLikeMusic,
  updateUserInfo,
  getUserDialogsInfo,
  dispatchDialogByUserId,
  getDialogInfo,
  setAllMsgInDialog,
  getTwoUsersDialogsId,
  addOneDialog,
  updateMusicInfo,
  getAllMusics
} = require('../db/common/index')


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
const { client, dbName } = require('../db/common');
const { resolve } = require('path');
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
  // 拿到用户id
  const userID = req.headers.userid?? '';
  const userInfo = await getUserInfo(userID)
  const likeList = userInfo.likeMusics

  const data = await new Promise((resolve, reject)=>{
    client.connect((err)=>{
      if(err){
        console.log(err);
       reject(err)
      }
      const db = client.db(dbName)
      let result = null
      // 根据音乐id查找指定音乐
      if(musicId.length > 1){
        result = db.collection('music').find(
          { _id: ObjectId(musicId) } 
        ).toArray()
      }
      else {
        result = db.collection('music').find(
          { id: musicId }
        ).toArray()
      }
      
      resolve(result)
    })
  })

  let musicInfo = null

  if(data.length){
    musicInfo = data[0]
    console.log('likeList', likeList, musicInfo)



    if(likeList.findIndex(item=>item===musicInfo._id.toString()) === -1){
      musicInfo.like = false
    }
    else {
      musicInfo.like = true
    }
  }
  res.send({
    code: 200,
    data: musicInfo
  })
})
// music mark
router.get('/musicMark/:id', async (req, res)=>{
  // 拿到用户id
  const userID = req.headers.userid?? '';
  const musicId = req.params.id
  // 添加计数
  const musicInfo = await getMusicById(musicId, userID)
  console.log('musicInfo.count', musicInfo)
  if(!musicInfo.count){
    musicInfo.count = 1
  }
  else {
    musicInfo.count = musicInfo.count + 1
  }
  updateMusicInfo(musicId, musicInfo)

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
        db.collection('album').findOne({_id: ObjectId(albumID)}, (err, result)=>{
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
      db.collection('album').updateOne({_id: ObjectId(albumID) }, {$set:{musicList: musicList}},(err, result)=>{
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
router.post('/musicLike', (req, res)=>{
  // 拿到用户id
  const userID = req.headers.userid?? '';
  const { musicId , state} = req.body

  setUserLikeMusic(userID, musicId, state)
  .then(data=>{
    res.send({
      code: 200,
      msg: '更新失败',
      data
    })
  })
  .catch(err=>{
    res.send({
      code: -1,
      msg: '更新失败',
      err
    })
  })
})


// album 
router.get('/album/:id', async (req, res)=>{
  const albumId = req.params.id
  console.log('albumId', albumId)
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
      const result = db.collection('album').find({_id:ObjectId(albumId)}).toArray()
      
      resolve(result)
    })
  })
  res.send({
    code: 200,
    data: data[0] ? data[0] : []
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
  // 拿到所有音乐进行排序
  const musics =  await getAllMusics()
  musics.sort((a, b)=>{
    return b.count - a.count
  })
  if(musics.length > 5){
    musics.splice(5)
  }
  const musicIds = musics.map(item=>{
    return item._id.toString()
  })

  // 拿到用户id
  const userID = req.headers.userid?? '';
  // const mockList = ['624d8c01f3bad8bc9895a334', '624d97a8f3bad8bc9895a70d', '62590e96f3bad8bc98984e95', '624d981cf3bad8bc9895a739', '62594a71f3bad8bc98987326']
  try {
    const promises = musicIds.map(item=>{
      return getMusicById(item, userID)
    })
    const result = await Promise.all(promises)
    res.send({
      code: 200,
      data: result
      // musicIds
    })
  }
  catch(e){
    res.send({
      code: -1,
      error: e
    })
  }
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
      userID: data[0]._id,
      username:  data[0].username,
      headIcon: data[0].headIcon
    }
  })
})

/**
 * register
 */
router.post('/register', async (req, res)=>{
  const {username, password} = req.body;
  // 如果两者有一个为null则返回错误
  const users = await getAllUserInfo()
  // 判断用户名是否已经存在
  if(users.findIndex(item=>item.username === username) !== -1){
    res.send({
      code: -1,
      msg: '用户名已经存在'
    })
    return
  }
  // 构建用户最近收听的音乐
  const albumId =  await addOneAlbum(`${username}最近收听的音乐`)
  console.log(albumId)
  // 构建文档 
  const document = {
    username : username,
    password : password,
    headIcon : "/images/headIcon/defaultHeadIcon.png",
    likeMusics: [],
    recent : {
        recentMusicAlbum : albumId,
        albumList : []
    },
    userFocusList : [],
    memoryList : []
  }
  const userId = await addOneUser(document)

  res.send({
    code: 200, 
    username, 
    userId
  })
})



// recent 

router.get('/recent', (req, res)=>{
  if(!verifyTokenFromRequest(req, res)) {
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
    like: [],
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

// 获取moments
// 辅助函数 --- 获取指定用户的动态信息
function getUserMoment(userID){
  return new Promise((resolve, reject)=>{
    client.connect((err)=>{
      if(err){
        console.log(err);
       reject(err)
      }
      const db = client.db(dbName)
      // 查询用户信息
      const data = db.collection('user').findOne({_id: ObjectId(userID)}, (err, userInfo)=>{
        if(err){
          reject(err)
          return
        }
        resolve({
          username: userInfo.username,
          headIcon: userInfo.headIcon,
          memoryList: userInfo.memoryList,
          userID
        })
      })
    })
  })
  .catch(e=>{
    console.error(e)
    return e
  })
}
// 辅助函数 --- 获取用户的关注列表
function getUserFocusList(userID){
  return new Promise((resolve, reject)=>{
    client.connect((err)=>{
      if(err){
        console.log(err);
       reject(err)
      }
      const db = client.db(dbName)
      // 查询用户信息
      const data = db.collection('user').findOne({_id: ObjectId(userID)}, (err, userInfo)=>{
        if(err){
          reject(err)
          return
        }
        resolve(userInfo.userFocusList)
      })
    })
  })
  .catch(e=>{
    console.error(e)
    return e
  })
}

// 获取动态信息
router.get('/moments', async (req, res)=>{
  const userID = req.headers.userid?? '';
  const userFocusList = await getUserFocusList(userID)
  const users = [userID, ...userFocusList]
  const promises = users.map(id=>{
    return getUserMoment(id)
  })
  Promise.all(promises)
  .then(moments=>{
    // 扁平化处理
    console.log(moments)
    let allMoments = []
    moments.forEach(userMomentInfo=>{
      let { username, headIcon, memoryList, userID } = userMomentInfo
      memoryList = memoryList.map(item=>{
        item.username = username
        item.headIcon = headIcon
        item.userID = userID
        return item
      })
      allMoments = [...allMoments, ...memoryList]
    })
    // 按照发布时间递减排序
    allMoments.sort((a, b)=>{
      const aTimeStamp = moment(a.time).valueOf()
      const bTimeStamp = moment(b.time).valueOf()
      return bTimeStamp - aTimeStamp
    })

    res.send({
      code: 200,
      userID,
      moments:allMoments
    })
  })
  .catch(e=>{
    res.send({
      code: -1,
      userID,
      msg: '获取失败'
    })
  })
})


// 提交动态的评论
router.post('/moment/comment', (req, res)=>{
  const { userID, time, info} = req.body
  new Promise((resolve, reject)=>{
    client.connect((err)=>{
      if(err){
        console.log(err);
       reject(err)
      }
      const db = client.db(dbName)
      // mongodb语句
      const data = db.collection('user').findOne({_id: ObjectId(userID)}, (err, result)=>{
        client.close()
        if(err) {
          reject(err)
          return 
        }
        resolve(result.memoryList)
      })
    })
  })
  .then(memoryList=>{
    const index = memoryList.findIndex(item=>item.time===time)
    if(index === -1) return
    const memory = memoryList[index]
    memory.comment.push(info)
    // 修改数据库
    return new Promise((resolve, reject)=>{
      client.connect((err)=>{
        if(err){
          console.log(err);
          reject(err)
        }
        const db = client.db(dbName)
        // mongodb语句
        const data = db.collection('user').updateOne({_id: ObjectId(userID)}, {
          $set: {
            memoryList
          }
        }, (err, result)=>{
          if(err){
            reject(err)
            return
          }
          reject(result)
        })
      })
    })
  })
  .then((result)=>{
    res.send({
      code: 200,
      msg: result
    })
  })
  .catch(err=>{
    console.log(err)
    res.send({
      code: -1,
      msg: '添加失败'
    })
  })
})

// 喜欢数据

router.post('/moment/like', (req, res)=>{
  const likeInfo = req.body
  const { userID, time, list} = likeInfo

  new Promise((resolve, reject)=>{
    client.connect((err)=>{
      if(err){
        console.log(err);
       reject(err)
      }
      const db = client.db(dbName)
      // 找到动态对应的用户
      const data = db.collection('user').findOne({_id: ObjectId(userID)}, (err, result)=>{
        client.close()
        if(err) {
          reject(err)
          return 
        }
        resolve(result.memoryList)
      })
    })
  })
  .then(memoryList=>{
    const index = memoryList.findIndex(item=>item.time===time)
    if(index === -1) return
    const memory = memoryList[index]
    // 修改的数据
    memory.like = list

    console.log('memoryList', memoryList)

    // 修改数据库
    return new Promise((resolve, reject)=>{
      client.connect((err)=>{
        if(err){
          console.log('连接失败', err);
          reject(err)
        }
        const db = client.db(dbName)
        // mongodb语句
        db.collection('user').updateOne({_id: ObjectId(userID)}, {$set: {memoryList}}, (err, result)=>{
          client.close()
          if(err){
            console.log('修改数据失败');
            reject(err)
            return
          }
          resolve(result)
        })
      })
    })
  })
  .then((result)=>{
    res.send({
      code: 200,
      msg: '操作成功'
    })
  })
  .catch(err=>{
    console.log(err)
    res.send({
      code: -1,
      msg: '喜欢操作失败'
    })
  })

})


// 获取对话框列表
router.get('/chatlist', async(req, res)=>{
  const userID = req.headers.userid?? '';


  // 根据这个userID拿到用户的对话列表
  new Promise((resolve, reject)=>{
    client.connect((err)=>{
      if(err){
        console.log(err);
       reject(err)
      }
      const db = client.db(dbName)
      // 查询用户拥有的对话框
      const data = db.collection('dialog').find({
        include: {$elemMatch:{$eq:userID}}
      }).toArray()
      resolve(data)
    })
  })
  .then(chatList=>{
    res.send({
      code: 200,
      chatList: chatList
    })
  })
  .catch(e=>{
    console.log(e)
    res.send({
      code: -1,
      msg: '获取失败'
    })
  })
})

/**
 * 获取所有未读信息
 */
router.get('/AllDialogUnreadMsg', async (req, res)=>{
  const userID = req.headers.userid?? '';
  const list = await getUserDialogsInfo(userID)
  const promises = list.map(async item=>{
    const { unReadlist } = await dispatchDialogByUserId(item, userID)
    return {
      dialogId: item._id,
      unReadlist
    }
  })
  const dialogsInfoRaw = await Promise.all(promises)
  // 去掉空消息
  const dialogsInfo = []
  dialogsInfoRaw.forEach(item=>{
    if(item.unReadlist.length !== 0){
      dialogsInfo.push(item)
    }
  })

  res.send(dialogsInfo)
})

/**
 * 获取制定对话框已读信息
 */
router.get('/dialogReadMsg', async (req, res)=>{
  const userID = req.headers.userid?? '';
  const { dialogId } = req.query
  const dialogInfo = await getDialogInfo(dialogId)
  const { readList } = await dispatchDialogByUserId(dialogInfo, userID)
  res.send(readList)
})






// 获取用户信息
router.get('/userInfo/:userId', (req, res)=>{
  const { userId } = req.params
  new Promise((resolve, reject)=>{
    client.connect((err)=>{
      if(err){
        console.log(err);
       reject(err)
      }
      console.log('数据库连接成功')
      const db = client.db(dbName)
      // mongodb语句
      const data = db.collection('user').findOne({_id: ObjectId(userId)}, (err, result)=>{
        if(err){
          reject(err)
          return
        }
        resolve(result)
      })
    })
  })
  .then(userInfo=>{
    res.send({
      code: 200,
      userInfo
    })
  })
  .catch(e=>{
    console.error(e)
    res.send({
      code: -2,
      msg: '查询失败'
    })
  })
})

// 获取指定对话框的聊天数据, 包含用户头像和用户名

router.get('/msglist/:dialogId', (req, res)=>{
  const { dialogId } = req.params
  console.log(dialogId)
  new Promise((resolve, reject)=>{
    client.connect((err)=>{
      if(err){
        console.log(err);
       reject(err)
      }
      console.log('数据库连接成功')
      const db = client.db(dbName)
      // 获取对话框列表数据
      db.collection('dialog').findOne({_id: ObjectId(dialogId)}, (err, dialogInfo)=>{
        if(err){
          reject(err)
          return
        }
        resolve({
          include: dialogInfo.include,
          messages: dialogInfo.messages
        })
      })
    })
  })
  .then(({include, messages})=>{
    // 获取用户的头像和姓名
    const usersInfoPromises = include.map(uid=>{
      return new Promise((resolve, reject)=>{
        client.connect((err)=>{
          if(err){
            console.log(err);
           reject(err)
          }
          const db = client.db(dbName)
          // mongodb语句
          db.collection('user').findOne({_id: ObjectId(uid)}, (err, userInfo)=>{
            if(err){
              reject(err)
              return
            }
            resolve({
              userId: uid,
              headIcon: userInfo.headIcon,
              username: userInfo.username
            })
          })
        })
      })
    })
    return Promise.all(usersInfoPromises)
    .then(usersInfo=>{
      res.send({
        code: 200,
        data: {
          usersInfo, 
          messages
        }
      })
    })
  })
  .catch(e=>{
    console.error(e)
    res.send({
      code: -1,
      msg: '获取对话框数据失败'
    })
  })
})


// 获取用户信息
router.get('/userInfo', async (req, res)=>{
  const userID = req.headers.userid?? '';
  try{
    const userInfo = await getUserInfo()
    res.send({
      code: 200,
      data: userInfo
    })
  }
  catch(e){
    res.send({
      code: -1,
      msg: '获取失败'
    })
  }
  
})

// 修改密码
router.post('/setPassword', (req, res)=>{
  const {password, newPassword} = req.body
  const userID = req.headers.userid?? '';
  getUserInfo(userID)
  .then(userInfo=>{
    if(userInfo.password === password){
      userInfo.password = newPassword
      updateUserInfo(userID, userInfo)
      .then(result=>{
        res.send({
          code: 200,
          msg: '更新成功'
        })
      })
    }
    else {
      res.send({
        code: -1,
        msg: '密码不匹配'
      })
    }
  })
})

// 修改头像
router.post('/setHeadIcon', (req, res)=>{
  const { headIcon } = req.body
  const userID = req.headers.userid?? '';
  getUserInfo(userID)
  .then(userInfo=>{
    userInfo.headIcon = headIcon
    return updateUserInfo(userID, userInfo)
  })
  .then(result=>{
    res.send({
      code: 200,
      msg: '修改成功'
    })
  })
  .catch(e=>{
    res.send({
      code: 200,
      msg: '修改失败',
      error: e
    })
  })
})

/**
 * 设置用户已读信息
 */

router.post('/setUserReadMsg', async (req, res)=>{
  const userID = req.headers.userid?? '';
  const { dialogId } = req.body
  const { messages } = await getDialogInfo(dialogId)
  messages.forEach(msg=>{
    const index = msg.readList.findIndex(id=>id===userID)
    if(index === -1){
      msg.readList.push(userID)
    }
  })
  console.log('userID', userID)
  // 写入数据库
  await setAllMsgInDialog(dialogId, messages)
  res.send({
    msg: '写入数据库', 
    messages
  })


})

/**
 * 获取与目标用户的对话框id
 */
router.get('/dialogId', async (req, res)=>{
  const userID = req.headers.userid?? '';
  const targetId = req.query.targetId
  // 查找是否有对话框
  const result = await getTwoUsersDialogsId(userID, targetId)
  let dialogId = -1
  if(!result){ // 还没有创建对话，新增一个对话
    dialogId = await addOneDialog(userID, targetId)
  }
  else {
    dialogId = result._id
  }

  res.send({
    dialogId
  })
})




module.exports = router;
