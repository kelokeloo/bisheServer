const { MongoClient, ObjectId } = require("mongodb");
const { connectUri, dataBaseName } = require("../config");
const client = new MongoClient(connectUri);

/**
 * @description 根据_id查找集合中的文档
 * @param collectionName string
 * @param _id string
 * @returns doc Promise<doc>
 */
export function findDocInCollectionById(collectionName, _id) {
  return new Promise(async (resolve, reject) => {
    try {
      await client.connect();
      const collection = client.db(dataBaseName).collection(collectionName);

      const query = {
        _id: ObjectId(_id),
      };
      const result = await collection.findOne(query);
      resolve(result);
    } catch (e) {
      reject(e);
    } finally {
      await client.close();
    }
  });
}

/**
 * @description 向集合中插入一条数据，并返回插入id
 * @param collectionName string
 * @returns insertedId Promise<string>
 */
export function insertDocToCollection(collectionName, document) {
  return new Promise(async (resolve, reject) => {
    try {
      await client.connect();
      const collection = client.db(dataBaseName).collection(collectionName);
      const result = await collection.insertOne(document);
      const insertedId = result.insertedId.toHexString();
      resolve(insertedId);
    } catch (e) {
      reject(e);
    } finally {
      client.close();
    }
  });
}

/**
 * @description 更新指定集合中的一个文档
 * @param collectionName string
 * @param _id string
 * @param updateDoc new docment
 * @returns upsertedId Promise<string>
 */
export function UpdateDocInCollectionById(collectionName, _id, newDoc) {
  return new Promise(async (resolve, reject) => {
    try {
      await client.connect();
      const collection = client.db(dataBaseName).collection(collectionName);

      const filter = {
        _id: ObjectId(_id),
      };
      const updateDoc = {
        $set: newDoc,
      };
      const result = await collection.updateOne(filter, updateDoc);
      const upsertedId = result.upsertedId.toHexString();
      resolve(upsertedId);
    } catch (e) {
      reject(e);
    } finally {
      client.close();
    }
  });
}

/**
 * @description 获取指定集合的所有文档
 * @param collectionName string
 */
export function findAllDocInCollection(collectionName) {
  return new Promise(async (resolve, reject) => {
    try {
      await client.connect();
      const collection = client.db(dataBaseName).collection(collectionName);

      const cursor = await collection.find({});
      const docs = await cursor.toArray();
      resolve(docs);
    } catch (e) {
      reject(e);
    } finally {
      await client.close();
    }
  });
}
