export const DB_NAME = 'ScreenVerseDB';
export const STORE_NAME = 'recordings';
export const METADATA_STORE = 'metadata';

// 录屏记录元数据接口
export interface RecordingMetadata {
  id: string;
  title: string;
  createdAt: number;
  duration: number;
  size: number;
  thumbnail?: string; // base64 缩略图
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2); // 升级版本号

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // 创建录屏数据存储
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      
      // 创建元数据存储
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        const metadataStore = db.createObjectStore(METADATA_STORE, { keyPath: 'id' });
        metadataStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
  return dbPromise;
}

// 生成唯一ID
function generateId(): string {
  return `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 从视频blob生成缩略图
async function generateThumbnail(videoBlob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.onloadedmetadata = () => {
      // 设置画布尺寸
      canvas.width = 320;
      canvas.height = 180;
      
      // 跳转到第一帧
      video.currentTime = 0;
    };
    
    video.onseeked = () => {
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
        resolve(thumbnail);
      }
    };
    
    video.src = URL.createObjectURL(videoBlob);
  });
}

export async function saveVideoToDB(blob: Blob, title?: string): Promise<string> {
  const db = await getDB();
  const id = generateId();
  const metadata: RecordingMetadata = {
    id,
    title: title || `录屏 ${new Date().toLocaleString('zh-CN')}`,
    createdAt: Date.now(),
    duration: 0, // 稍后更新
    size: blob.size,
  };
  
  return new Promise(async (resolve, reject) => {
    try {
      // 先生成缩略图和获取时长
      const thumbnail = await generateThumbnail(blob);
      metadata.thumbnail = thumbnail;
      
      // 获取视频时长
      const duration = await getVideoDuration(blob);
      metadata.duration = duration;
      
      // 现在执行数据库操作
      const transaction = db.transaction([STORE_NAME, METADATA_STORE], 'readwrite');
      const videoStore = transaction.objectStore(STORE_NAME);
      const metadataStore = transaction.objectStore(METADATA_STORE);
      
      // 保存视频数据
      const videoRequest = videoStore.put(blob, id);
      
      // 保存元数据
      const metadataRequest = metadataStore.put(metadata);
      
      transaction.oncomplete = () => resolve(id);
      transaction.onerror = (event) => reject((event.target as IDBRequest).error);
    } catch (error) {
      reject(error);
    }
  });
}

export async function getVideoFromDB(id?: string): Promise<Blob | null> {
  const db = await getDB();
  const videoId = id || 'latest_recording'; // 兼容旧版本
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(videoId);

    request.onsuccess = (event) => {
      const result = (event.target as IDBRequest).result;
      resolve(result || null);
    };

    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

export async function getAllRecordings(): Promise<RecordingMetadata[]> {
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(METADATA_STORE, 'readonly');
    const store = transaction.objectStore(METADATA_STORE);
    const index = store.index('createdAt');
    const request = index.getAll();

    request.onsuccess = (event) => {
      const results = (event.target as IDBRequest).result as RecordingMetadata[];
      // 按创建时间倒序排列
      resolve(results.reverse());
    };

    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

export async function updateRecordingTitle(id: string, title: string): Promise<void> {
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(METADATA_STORE, 'readwrite');
    const store = transaction.objectStore(METADATA_STORE);
    
    // 先获取现有数据
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      const metadata = getRequest.result as RecordingMetadata;
      if (metadata) {
        metadata.title = title;
        const putRequest = store.put(metadata);
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject((event.target as IDBRequest).error);
      } else {
        reject(new Error('Recording not found'));
      }
    };
    
    getRequest.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

export async function deleteRecording(id: string): Promise<void> {
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME, METADATA_STORE], 'readwrite');
    const videoStore = transaction.objectStore(STORE_NAME);
    const metadataStore = transaction.objectStore(METADATA_STORE);
    
    const videoRequest = videoStore.delete(id);
    const metadataRequest = metadataStore.delete(id);
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

export async function clearDB(): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME, METADATA_STORE], 'readwrite');
      const videoStore = transaction.objectStore(STORE_NAME);
      const metadataStore = transaction.objectStore(METADATA_STORE);
      
      const videoRequest = videoStore.clear();
      const metadataRequest = metadataStore.clear();
  
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => reject((event.target as IDBRequest).error);
    });
}

// 获取视频时长的辅助函数
async function getVideoDuration(videoBlob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.onloadedmetadata = () => {
      resolve(video.duration);
    };
    video.src = URL.createObjectURL(videoBlob);
  });
}
