const WebSocket = require('ws');


const wsServer = new WebSocket.Server({ port: 8080 });

// item
// {userId, connect}
let connects = []

function connectsClear(connects){
  // 遍历connects的状态,将断开连接的从中去除
  const list = []
  connects.forEach(item=>{
    if(item.connect.readyState === 1)
      list.push(item)
  })
  return list
}

// 侦听连接
wsServer.on('connection', function connection(connect) {
    // 处理来自用户发送的消息
    connect.on('message', (msg)=>{
      let info = JSON.parse(msg)
      console.log('info', info)
      // 清理无效连接
      connects = connectsClear(connects)
      

      let index = -1
      switch (info.type) {
        case 'connect':
          // 在connects中查找
          index = connects.findIndex(item=>item.userId === info.userId)
          if(index !== -1){
            // 关闭之前的连接
            connects[index].connect.close()
            connects.splice(index, 1)
          }
          // 将新的连接添加进去
          connects.push({
            userId:info.userId,
            connect
          })
          console.log(`${info.userId} 的socket连接已经添加到connects中，当前连接用户为${
            connects.map(item=>item.userId).toString()
          }`)
          break;

        case 'message':
          console.log('message---', info.message)
          break;
          default:
          break;
      }

      

    });
});

