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
function getMusicById(musicId){
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
  addOneAlbum
}



