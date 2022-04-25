const WebSocket = require('ws');
const { 
  getDialogInfo,
  addMessageToDialog,
  getUserInfo 
} = require('../db/common/index')

const wsServer = new WebSocket.Server({ port: 8080 });



let connects = [] 


function connectsClear(connects){
  // 遍历connects的状态,将断开连接的从中去除
  const list = []
  connects.forEach(item=>{
    if(item.connect.readyState === 1) // 正常的连接
      list.push(item)
  })
  return list
}

// 侦听连接
wsServer.on('connection', function connection(connect) {
    // 处理来自用户发送的消息
    connect.on('message', async (msg)=>{
      let info = JSON.parse(msg)
      // console.log('info', info)
      // 清理无效连接
      connects = connectsClear(connects)
      
      let index = -1
      switch (info.type) {
        case 'connect':
          // 在connects中查找
          index = connects.findIndex(item=>item.userId === info.value)
          if(index !== -1){
            // 关闭之前的连接
            connects[index].connect.close()
            connects.splice(index, 1)
          }
          // 将新的连接添加进去
          connects.push({
            userId:info.value,
            connect
          })
          console.log(`${info.value} 的socket连接已经添加到connects中，当前连接用户为${
            connects.map(item=>item.userId).toString()
          }`)
          connect.send(JSON.stringify({
            type: 'connect',
            value: '绑定成功'
          }))

          break;

        case 'message':
          const { dialogId, data: msg } = info.value
          const { belong } = msg
          console.log('[未读消息]', msg)
          // 获取对话框信息
          const dialogInfo = await getDialogInfo(dialogId)
          // 对话信息存入数据库当中
          await addMessageToDialog(dialogId, msg)

          // 对话框相关用户是否登录，如果登录，立马发给这些用户
          const relateUsersId = dialogInfo.include
          // 获取对话框相关用户
          const belongIndex = relateUsersId.findIndex(item=>item===belong)
          relateUsersId.splice(belongIndex, 1)
          // console.log('relateUsersId', relateUsersId)
          // console.log('connects', connects)

          // 从相关用户中提取出已登录用户
          const onlineUserConnects = []
          relateUsersId.forEach(userid=>{
            const onlineUserIndex = connects.findIndex(item=>item.userId === userid)
            if(onlineUserIndex >= 0){ // 在线用户
              onlineUserConnects.push(connects[onlineUserIndex])
            }
          })

          // 向在线的用户发送消息
          onlineUserConnects.forEach(async connectInfo=>{
            const { connect, userId } = connectInfo
            // 获取用户信息
            const { username, headIcon } = await getUserInfo(belong)
            const copyMsg = JSON.parse(JSON.stringify(msg))
            copyMsg.headIcon = headIcon
            copyMsg.username = username
            // 发送到前端
            connect.send(JSON.stringify({
              type: 'message',
              value: {
                dialogId,
                msg: copyMsg
              }
            }))
          })



          console.log('onlineUserConnects', onlineUserConnects)

          try {
            //  const dialogInfo = await getDialogInfo(dialogId)
            //  let relateUsers = dialogInfo.include
            //  const index = relateUsers.findIndex(item=>item === belong)
            //  relateUsers.splice(index, 1)
            //  // 与该对话框相关的用户
            //  console.log('relateUsers', relateUsers)
            // const msgFrame = {
            //   belong,
            //   text ,
            //   musicId ,
            //   time
            // }
            // relateUsers.forEach(targetUser=>{
            //   // 判断该用户是否在线
            //   connects = connectsClear(connects)
            //   const index = connects.findIndex(item=>item.userId === targetUser)
              
            //   msgFrame.isRead = true

            //   // 先存入数据库
            //   addMessageToDialog(dialogId, msgFrame)
            //   .then(result=>{
            //     console.log('成功存入数据库', result)

            //     if(index >= 0){ // 如果用户在线，直接发送过去
            //       let connect = connects[index].connect
            //       msgFrame.dialogId = dialogId
            //       msgFrame.username = username
            //       msgFrame.headIcon = headIcon
            //       console.log('发送消息', msgFrame)
            //       connect.send(JSON.stringify({
            //         type: 'dialog',
            //         message: msgFrame
            //       }))
            //     }
            //   }) 
            // })     
          }
          catch(e){
            console.log(e)
          }
          break;
          default:
          break;
      }
    });
});

