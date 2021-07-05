import functions = require("firebase-functions");
import admin = require("firebase-admin");
const spawn = require("child-process-promise").spawn;
import path = require("path");
import os = require("os");
// import fs = require("fs");
import { ObjectMetadata } from "firebase-functions/lib/providers/storage";

// see https://imagemagick.org/script/convert.php
// see https://github.com/firebase/functions-samples/tree/master/convert-images

exports.processImages = functions
  .runWith({ memory: "2GB", timeoutSeconds: 530 })
  .storage.object()
  .onFinalize(async (object: ObjectMetadata) => {
    const contentType = object.contentType;
    if (contentType && !contentType.startsWith("image/")) {
      // to console.log when troubleshooting
      // const metageneration = object.metageneration;
      // console.log(JSON.stringify(metageneration))
      return;
    }
    const fileBucket = object.bucket;
    const filePath: string = object.name ? object.name : `void`;
    const pathObj = path.parse(filePath);
    // const baseDir = pathObj.dir.substr(0, pathObj.dir.length - 4);
    const bucket = admin.storage().bucket(fileBucket);
    const tempSourceFilePath = path.join(os.tmpdir(), pathObj.base);
    const metadata = {
      contentType: contentType,
    };
    const widths: number[] = [300, 1300];
    // let processing: boolean = false;
    if (filePath.startsWith(`uploadMedia/`) && pathObj.ext === ".jpg") {
      // console.log(`ACCEPTED ${filePath}`)
      // processing = true
      await bucket.file(filePath).download({ destination: tempSourceFilePath });
      widths.map(async (width) => {
        if (width < 2000) {
          const tempWriteFilePath = path.join(
            os.tmpdir(),
            `${width}-${pathObj.base}`
          );
          // console.log(`TEMP FILE LOCATION ${tempWriteFilePath} BASE ${baseDir}`)
          const uploadPath = path.join("publicMedia/", `${width}/${pathObj.base}`);
          // console.log(`STARTING ON ${uploadPath}`)
          try {
            await spawn("convert", [
              tempSourceFilePath,
              "-thumbnail",
              `${width}`,
              tempSourceFilePath,
            ]);
            // console.log(`PROCESSED ${tempWriteFilePath} '${width}'`);
          } catch (e) {
            console.error(`ERROR IN IMAGEMAGICK CONVERTING ${e}`);
          } finally {
            try {
              bucket.upload(tempSourceFilePath, {
                destination: uploadPath,
                predefinedAcl: "publicRead",
                metadata: metadata,
              });
            } catch (e) {
              console.error(`ERROR IN UPLOADING TO STORAGE ${e}`);
            } finally {
              console.log(`WROTE ${tempWriteFilePath} to ${uploadPath}`);
              // fs.unlinkSync(tempWriteFilePath);
              // bucket.file(uploadPath).getSignedUrl()
            }
          }
        }
      });
    } else {
      // console.log(`IGNORED ${filePath}`)
    }
    // if (processing) fs.unlinkSync(tempSourceFilePath);
    return;
  });
