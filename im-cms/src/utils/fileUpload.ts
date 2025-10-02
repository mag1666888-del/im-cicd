import CryptoJS from 'crypto-js';
import { getPartSize, initiateMultipartUpload, completeMultipartUpload, updateAccountInfo } from '@/services/ant-design-pro/api';

// 文件上传配置
export interface FileUploadConfig {
  fileName: string;
  fileType: string;
  userID?: string;
  updateAccount?: boolean; // 是否更新账户信息
}

// 文件上传结果
export interface FileUploadResult {
  url: string;
  success: boolean;
  error?: string;
}

// 计算文件分片MD5哈希（按照后端算法）
export const calculateFileHash = async (file: File) => {
  const partSize = 1024 * 1024; // 1MB 分片大小
  
  // 计算分片
  const parts = await calculatePartMD5s(file, partSize);
  
  // 计算分片组合的 MD5
  const combinedParts = parts.join(',');
  const combinedMD5 = calculateMD5String(combinedParts);
  
  return {
    hash: combinedMD5, // 用于 initiate_multipart_upload
    parts: parts       // 用于 complete_multipart_upload
  };
};

// 计算分片MD5
const calculatePartMD5s = async (file: File, partSize: number): Promise<string[]> => {
  const parts: string[] = [];
  const totalParts = Math.ceil(file.size / partSize);
  
  for (let i = 0; i < totalParts; i++) {
    const start = i * partSize;
    const end = Math.min(start + partSize, file.size);
    const chunk = file.slice(start, end);
    
    const chunkMD5 = await calculateChunkMD5(chunk);
    parts.push(chunkMD5);
  }
  
  return parts;
};

// 计算单个分片的MD5
const calculateChunkMD5 = (chunk: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          reject(new Error('无法读取分片内容'));
          return;
        }
        
        const uint8Array = new Uint8Array(arrayBuffer);
        const hash = calculateMD5FromBytes(uint8Array);
        resolve(hash);
      } catch (error) {
        console.error('分片MD5计算失败:', error);
        reject(error);
      }
    };
    reader.onerror = (error) => {
      console.error('分片读取失败:', error);
      reject(error);
    };
    reader.readAsArrayBuffer(chunk);
  });
};

// 从字节数组计算MD5
const calculateMD5FromBytes = (bytes: Uint8Array): string => {
  // 将Uint8Array转换为WordArray
  const wordArray = CryptoJS.lib.WordArray.create(bytes);
  
  // 使用crypto-js计算MD5
  const hash = CryptoJS.MD5(wordArray);
  
  // 返回小写十六进制字符串
  return hash.toString(CryptoJS.enc.Hex).toLowerCase();
};

// 计算字符串的MD5
const calculateMD5String = (str: string): string => {
  return CryptoJS.MD5(str).toString(CryptoJS.enc.Hex).toLowerCase();
};

// 上传文件到预签名URL
const uploadToPresignedUrl = async (file: File, presignedUrl: string): Promise<string> => {
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });
  
  if (!response.ok) {
    throw new Error(`上传失败: ${response.statusText}`);
  }
  
  // 从响应头获取ETag作为part的标识
  const etag = response.headers.get('ETag')?.replace(/"/g, '') || '';
  return etag;
};

// 完整的文件上传流程
export const uploadFile = async (file: File, config: FileUploadConfig): Promise<FileUploadResult> => {
  try {
    console.log('开始文件上传流程:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      config
    });
    
    // 1. 计算文件分片MD5哈希
    console.log('步骤1: 计算文件分片哈希...');
    const fileHash = await calculateFileHash(file);
    console.log('文件哈希:', fileHash.hash);
    console.log('分片哈希:', fileHash.parts);
    
    // 2. 获取分片上传大小
    console.log('步骤2: 获取分片大小...');
    const partSizeResponse = await getPartSize({ size: file.size });
    console.log('分片大小响应:', partSizeResponse);
    
    if (partSizeResponse.errCode !== 0) {
      throw new Error(`获取分片大小失败: ${partSizeResponse.errMsg}`);
    }
    const partSize = partSizeResponse.data.size;
    console.log('分片大小:', partSize);
    
    // 3. 初始化分片上传
    console.log('步骤3: 初始化分片上传...');
    const initRequest = {
      hash: fileHash.hash,
      size: file.size,
      partSize,
      maxParts: -1,
      cause: '',
      name: config.fileName,
      contentType: config.fileType,
    };
    console.log('初始化请求参数:', initRequest);
    
    const initResponse = await initiateMultipartUpload(initRequest);
    console.log('初始化响应:', initResponse);
    
    if (initResponse.errCode !== 0) {
      throw new Error(`初始化分片上传失败: ${initResponse.errMsg}`);
    }
    
    // 检查是否直接返回了URL（无需后续上传）
    if (initResponse.data.url) {
      console.log('接口直接返回了URL，跳过后续上传步骤:', initResponse.data.url);
      const finalUrl = initResponse.data.url;
      
      // 6. 更新账户信息（如果需要）
      if (config.updateAccount && config.userID) {
        console.log('步骤6: 更新账户信息...');
        const updateResponse = await updateAccountInfo({
          userID: config.userID,
          faceURL: finalUrl,
        });
        console.log('更新账户信息响应:', updateResponse);
        
        if (updateResponse.errCode !== 0) {
          throw new Error(`更新账户信息失败: ${updateResponse.errMsg}`);
        }
        
        console.log('账户信息更新完成');
      }
      
      console.log('文件上传流程完成（直接返回URL）');
      return {
        url: finalUrl,
        success: true
      };
    }
    
    // 需要分片上传的情况
    const { uploadID, sign } = initResponse.data.upload;
    console.log('上传ID:', uploadID);
    console.log('预签名URL:', sign.parts[0].url);
    
    // 4. 上传文件到预签名URL
    console.log('步骤4: 上传文件到预签名URL...');
    const presignedUrl = sign.parts[0].url;
    const etag = await uploadToPresignedUrl(file, presignedUrl);
    console.log('上传完成，ETag:', etag);
    
    // 5. 完成分片上传
    console.log('步骤5: 完成分片上传...');
    const completeRequest = {
      uploadID,
      parts: fileHash.parts, // 使用计算出的分片MD5
      cause: '',
      name: config.fileName,
      contentType: config.fileType,
    };
    console.log('完成上传请求参数:', completeRequest);
    
    const completeResponse = await completeMultipartUpload(completeRequest);
    console.log('完成上传响应:', completeResponse);
    
    if (completeResponse.errCode !== 0) {
      throw new Error(`完成分片上传失败: ${completeResponse.errMsg}`);
    }
    
    const finalUrl = completeResponse.data.url;
    console.log('上传成功，最终URL:', finalUrl);
    
    // 6. 更新账户信息（如果需要）
    if (config.updateAccount && config.userID) {
      console.log('步骤6: 更新账户信息...');
      const updateResponse = await updateAccountInfo({
        userID: config.userID,
        faceURL: finalUrl,
      });
      console.log('更新账户信息响应:', updateResponse);
      
      if (updateResponse.errCode !== 0) {
        throw new Error(`更新账户信息失败: ${updateResponse.errMsg}`);
      }
      
      console.log('账户信息更新完成');
    }
    
    console.log('文件上传流程完成');
    return {
      url: finalUrl,
      success: true
    };
    
  } catch (error: any) {
    console.error('文件上传失败，详细错误:', error);
    console.error('错误堆栈:', error?.stack);
    return {
      url: '',
      success: false,
      error: error.message || '上传失败'
    };
  }
};

// 头像上传专用函数
export const uploadAvatar = async (file: File, userID: string): Promise<FileUploadResult> => {
  return uploadFile(file, {
    fileName: `${userID}/${file.name}`,
    fileType: file.type,
    userID,
    updateAccount: true
  });
};

// 通用文件上传函数
export const uploadGenericFile = async (file: File, fileName: string): Promise<FileUploadResult> => {
  return uploadFile(file, {
    fileName,
    fileType: file.type,
    updateAccount: false
  });
};
