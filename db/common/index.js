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




module.exports = {
  client,
  dbName,
  getDialogInfo,
  addMessageToDialog
}



