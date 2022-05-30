import {
  findDocInCollectionById,
  UpdateDocInCollectionById,
  findAllDocInCollection,
  insertDocToCollection,
} from "../baseManipulate/index";

const collectionName = "music";

/**
 * 获取音乐信息, 返回音乐信息的Promise
 */
export async function getMusicById(musicId) {
  try {
    const userInfo = await findDocInCollectionById(collectionName, musicId);
    return userInfo;
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * 获取所有音乐, 返回一个数组, 数组元素为音乐信息
 */
export async function getAllMusics() {
  try {
    const musics = await findAllDocInCollection(collectionName);
    return musics;
  } catch (e) {
    return Promise.reject(e);
  }
}
