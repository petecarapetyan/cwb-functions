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
    const db = await admin.firestore();
    const contentType = object.contentType;
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
    const MEDIA_UPLOADED = "mediaUploaded";
    const PUBLIC_MEDIA = "publicMedia";
    // let processing: boolean = false;
    if (filePath.startsWith(`${MEDIA_UPLOADED}`)) {
      // if (filePath.startsWith(`${MEDIA_UPLOADED}/`) && pathObj.ext === ".jpg") {
      console.log(
        `ACCEPTED ${filePath} BUT ` +
          filePath.startsWith(`${MEDIA_UPLOADED}/`) +
          " AND " +
          pathObj.ext ===
          ".jpg"
      );
      // processing = true
      await bucket.file(filePath).download({ destination: tempSourceFilePath });

      if (contentType && contentType.startsWith("image/")) {
        // to console.log when troubleshooting
        // const metageneration = object.metageneration;
        // console.log(JSON.stringify(metageneration))

        widths.map(async (width) => {
          if (width < 2000) {
            // const tempWriteFilePath = path.join(
            //   os.tmpdir(),
            //   `${width}-${pathObj.base}`
            // );
            // console.log(`TEMP FILE LOCATION ${tempWriteFilePath}`)
            const uploadPath = path.join(
              `${PUBLIC_MEDIA}`,
              `${width}/${pathObj.base}`
            );
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
                // console.log(`ABOUT TO WRITE ${PUBLIC_MEDIA} of ${uploadPath}`);
                bucket.upload(tempSourceFilePath, {
                  destination: uploadPath,
                  predefinedAcl: "publicRead",
                  metadata: metadata,
                });
                // console.log(`BUCKET WRITE ${PUBLIC_MEDIA} of ${uploadPath}`);
                await db
                  .collection(`${PUBLIC_MEDIA}_${width}`)
                  .doc(`${pathObj.name}`)
                  .set({
                    file: pathObj.ext,
                  });
                // console.log(`DBWRITE ${PUBLIC_MEDIA} of ${uploadPath}`);
              } catch (e) {
                console.error(`ERROR IN UPLOADING TO STORAGE ${e}`);
              } finally {
                // console.log(`WROTE ${tempWriteFilePath} to ${uploadPath}`);
                // fs.unlinkSync(tempWriteFilePath);
                // bucket.file(uploadPath).getSignedUrl()
              }
            }
          }
        });
      } else {
        // make file public without conversion

        const uploadPath = path.join(
          `${PUBLIC_MEDIA}`,
          `files/${pathObj.base}`
        );
        try {
          // console.log(`ABOUT TO WRITE ${PUBLIC_MEDIA} of ${uploadPath}`);
          bucket.upload(tempSourceFilePath, {
            destination: uploadPath,
            predefinedAcl: "publicRead",
            metadata: metadata,
          });
          // console.log(`BUCKET WRITE ${PUBLIC_MEDIA} of ${uploadPath}`);
          await db
            .collection(`${PUBLIC_MEDIA}_files`)
            .doc(`${pathObj.name}`)
            .set({
              file: pathObj.ext,
            });
          // console.log(`DBWRITE ${PUBLIC_MEDIA} of ${uploadPath}`);
        } catch (e) {
          console.error(`ERROR IN UPLOADING TO STORAGE ${e}`);
        } finally {
          // console.log(`WROTE ${tempWriteFilePath} to ${uploadPath}`);
          // fs.unlinkSync(tempWriteFilePath);
          // bucket.file(uploadPath).getSignedUrl()
        }
      }
    } else {
      // console.log(`IGNORED ${filePath} of ${contentType} EXT ${pathObj.ext}`)
    }
    // if (processing) fs.unlinkSync(tempSourceFilePath);
    return;
  });
