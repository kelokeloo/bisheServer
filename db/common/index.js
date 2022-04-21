const { MongoClient, ObjectId } = require('mongodb');
const dbName = 'music'

const url = `mongodb://localhost:27017/${dbName}`;

const client = new MongoClient(url)


/**
 * 获取Dialog包含的用户
 */
function getDialogInfo(dialogId){
  return new Promise((resolve, reject)=>{
    client.connect((err)=>{
      if(err){reject(err)}
      const db = client.db(dbName)
      // 查找
      db.collection('dialog').findOne({_id: ObjectId(dialogId)}, (err, result)=>{
        if(err) reject(err)
        resolve(result)
      })
    })
  })
}

/**
 * 给dialog添加信息
 */

function addMessageToDialog(dialogId, message){
  return new Promise((resolve, reject)=>{
    client.connect(async(err)=>{
      if(err){reject(err)}
      // 获取原来的数据
      try {
        const dialogInfo = await getDialogInfo(dialogId)
        // 
        const { messages } = dialogInfo
        messages.push(message)

        const db = client.db(dbName)
        // 更新
        db.collection('dialog').updateOne({_id: ObjectId(dialogId)}, 
        {
          $set:{messages: messages}
        },
        (err, result)=>{
          resolve(result)
        })
      }
      catch(e){
        reject(e)
      }
    })
  })
}

/**
 * 获取用户信息
 */

function getUserInfo(userId){
  return new Promise((resolve, reject)=>{
    client.connect(async(err)=>{
      if(err){reject(err)}
      // 获取原来的数据
      try {
        const db = client.db(dbName)
        // 更新
        db.collection('user').findOne({_id: ObjectId(userId)}, (err, result)=>{
          if(err){reject(err)} // 查找错误
          else {
            resolve(result)
          }
        })
      }
      catch(e){
        reject(e)
      }
    })
  })
}

/**
 * 更新用户信息
 */
function updateUserInfo(userId, document){
  // console.log(userId, document)
  return new Promise((resolve, reject)=>{
    client.connect(async(err)=>{
      if(err){reject(err)}
      // 获取原来的数据
      const db = client.db(dbName)
        // 更新
      db.collection('user').updateOne({_id: ObjectId(userId)}, {$set: document }, (err, result)=>{
        if(err){
          console.log(err)
          reject(err)
        }
        resolve(result)
      })
    })
  })
}



/**
 * 获取所有用户信息
 */

function getAllUserInfo(){
  return new Promise((resolve, reject)=>{
    client.connect((err)=>{
      if(err){reject(err)}
      // 获取原来的数据
      try {
        const db = client.db(dbName)
        // 更新
        const result = db.collection('user').find({}).toArray()
        resolve(result)
      }
      catch(e){
        reject(e)
      }
    })
  })
}

/**
 * 插入一个用户
 */

function addOneUser(document){
  return new Promise((resolve, reject)=>{
    client.connect(async (err)=>{
      if(err){reject(err)}
      // 获取原来的数据
      try {
        const db = client.db(dbName)
        // 插入
        const result = await db.collection('user').insertOne(document)
        resolve(result.insertedId)
      }
      catch(e){
        reject(e)
      }
    })
  })
}


/**
 * 插入一个歌单
 */

function addOneAlbum(title, content){{
  const document = {
    "title": title ,
    "content": content ,
    "imgUrl" : "/images/handpick/20220406151752.jpg", // 默认图像
    "musicList" : []
  }
  return new Promise(async (resolve, reject)=>{
    client.connect(async (err)=>{
      if(err){reject(err)}
      // 获取原来的数据
      try {
        const db = client.db(dbName)
        // 插入
        const result = await db.collection('album').insertOne(document)
        resolve(result.insertedId) // 返回插入的id
      }
      catch(e){
        reject(e)
      }
    })
  })

}}



/**
 * 获取音乐
 */
function getMusicById(musicId, userId){
  return new Promise((resolve, reject)=>{
    client.connect(async(err)=>{
      if(err){reject(err)}
      try {
        const db = client.db(dbName)
        // 更新
        db.collection('music').findOne({_id: ObjectId(musicId)}, (err, result)=>{
          if(err){reject(err)} // 查找错误
          else {
            resolve(result)
          }
        })
      }
      catch(e){
        reject(e)
      }
    })
  })
  .then(musicInfo=>{
    // 找到音乐之后判断是否是用户喜欢的音乐
    return new Promise((resolve, reject)=>{
      client.connect(async(err)=>{
        if(err){reject(err)}
        try {
          const db = client.db(dbName)
          // 更新
          db.collection('user').findOne({_id: ObjectId(userId)}, (err, result)=>{
            if(err){reject(err)} // 查找错误
            else {
              const likeMusics = result.likeMusics

              const index = likeMusics.findIndex(item=>item === musicInfo._id.toString())
              if(index !== -1){ // 喜欢标记
                musicInfo.like = true
              }
              else {
                musicInfo.like = false
              }
              resolve(musicInfo)
            }
          })
        }
        catch(e){
          reject(e)
        }
      })
    })
    
  })
}

/**
 * 设置用户喜欢的音乐
 */
function setUserLikeMusic(userId, musicId, state){
  return new Promise(async (resolve, reject)=>{
    const userInfo = await getUserInfo(userId)
    const likeMusics = userInfo.likeMusics
    
    // 判断是否在喜欢列表中
    const index = likeMusics.findIndex(item=>item === musicId)
    switch (state) {
      case true: 
        if(index === -1){
          likeMusics.push(musicId)
        }
        break;
      case false:
        if(index !== -1){
          likeMusics.splice(index, 1)
        }
        break;
    }
    
    
    // // 更新到数据库中
    userInfo.likeMusics = likeMusics
    return updateUserInfo(userId, userInfo)
  })
  .then((result)=>{
    console.log('result',result)
    return {
      msg: '更新成功',
      result
    }
  })
    
  
}



/**
 * 获取与用户有关的对话框
 */
function getUserDialogsInfo(userId){
  return new Promise((resolve, reject)=>{
    client.connect((err)=>{
      if(err){
        console.log(err);
       reject(err)
      }
      const db = client.db(dbName)
      // 查询用户拥有的对话框
      const data = db.collection('dialog').find({
        include: {$elemMatch:{$eq:userId}}
      }).toArray()
      resolve(data)
    })
  })
}

/**
 * 分离已读和未读
 */
async function dispatchDialogByUserId(dialogInfo, userId){
  // console.log('dialogInfo', dialogInfo)
  const readList = []
  const unReadlist = []
  const { messages, include } = dialogInfo
  // 获取用户信息
  const promises = include.map(userId=>{
    return getUserInfo(userId)
  })
  const usersInfo = await Promise.all(promises)

  messages.forEach(msg=>{
    const { readList: readListRaw } = msg
    // 找到头像、姓名
    const userInfoIndex = usersInfo.findIndex(item=>item._id.toString()===msg.belong)
    // 添加头像、姓名
    msg.headIcon = usersInfo[userInfoIndex].headIcon
    msg.username = usersInfo[userInfoIndex].username

    const index = readListRaw.findIndex(item=>item===userId)
    if(index === -1){ // 未读
      unReadlist.push(msg)
    }
    else { // 已读
      readList.push(msg)
    }
  })
  return {
    readList,
    unReadlist
  }
}


module.exports = {
  client,
  dbName,
  getDialogInfo,
  addMessageToDialog,
  getUserInfo,
  getMusicById,
  getAllUserInfo,
  addOneUser,
  addOneAlbum,
  setUserLikeMusic,
  updateUserInfo,
  getUserDialogsInfo,
  dispatchDialogByUserId
}



