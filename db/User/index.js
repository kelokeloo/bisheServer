import {
  findDocInCollectionById,
  UpdateDocInCollectionById,
  findAllDocInCollection,
  insertDocToCollection,
} from "../baseManipulate/index";

const collectionName = "user";

/**
 * 获取用户信息, 返回用户信息的Promise
 */
export async function getUserInfo(userId) {
  try {
    const userInfo = await findDocInCollectionById(collectionName, userId);
    return userInfo;
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * 更新用户信息, 返回更新文档Id的Promise
 */
export async function updateUserInfo(userId, document) {
  try {
    const upsertedId = await UpdateDocInCollectionById(
      collectionName,
      userId,
      document
    );
    return upsertedId;
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * 获取所有用户信息, 返回所有docs的Promise
 */
export async function getAllUserInfo() {
  try {
    const docs = await findAllDocInCollection(collectionName);
    return docs;
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * 插入一个用户，返回插入用户id的Promise
 */
export async function insertOneUser(document) {
  try {
    const insertedId = await insertDocToCollection(collectionName, document);
    return insertedId;
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * 添加音乐到用户喜欢的音乐列表, 成功返回true
 */
export async function addMusicToUserLikeList(userId, musicId) {
  try {
    const userInfo = await getUserInfo(userId);
    const { likeMusics } = userInfo;
    const index = likeMusics.findIndex((id) => id === musicId);
    if (index === -1) {
      // 不在喜欢列表就添加
      likeMusics.push(musicId);
    }
    userInfo.likeMusics = likeMusics;
    await updateUserInfo(userId, userInfo);
    return true;
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * 将音乐从用户的音乐喜欢列表移除, 成功返回true
 */
export async function removeMusicFromUserLikeList(userId, musicId) {
  try {
    const userInfo = await getUserInfo(userId);
    const { likeMusics } = userInfo;
    const index = likeMusics.findIndex((id) => id === musicId);
    if (index !== -1) {
      // 在喜欢列表就移除
      likeMusics.splice(index, 1);
    }
    userInfo.likeMusics = likeMusics;
    await updateUserInfo(userId, userInfo);
    return true;
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * 获取用户喜欢的音乐列表
 */
export async function getUserLikeMusicList(userId) {
  try {
    const userInfo = await getUserInfo(userId);
    return userInfo.likeMusics;
  } catch (e) {
    return Promise.reject(e);
  }
}
