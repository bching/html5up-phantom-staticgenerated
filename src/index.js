const {promisify} = require('util');
const ejsRenderFile = promisify(require('ejs').renderFile);
const fs = require('fs-extra');
const path = require('path');
const globP = promisify(require('glob'));

const srcPath = './src';
const distPath ='./public';
const albumRoot = './src/images/albums'

const getAlbums = fs.readdirSync(albumRoot);

let dataConfig = [];

getAlbums.forEach(album => {
  let albumObj = {}
  const stat = fs.statSync(albumRoot + '/' + album);
  console.log('detected album:', album);
  if(stat && stat.isDirectory()) {
    const albumContents = fs.readdirSync(albumRoot + '/' + album);
    let text = '';
    const imgLinks = [];
    albumContents.forEach(item => {
      if(item.split('.').pop() === "txt") {
        text += fs.readFileSync(albumRoot + '/' + album + '/' + item, {encoding: 'utf-8'},
          (err, buf) => {
            if(err) {
              console.log(err);
              return;
            }
            return buf;
          });
      }
      if(item.split('.').pop().match(/^(jpg|JPG)$/)) {
        imgLinks.push(`${album}/${item}`);
      }
    })
    albumObj.text = text;
    albumObj.imgs = imgLinks;
    dataConfig[album] = albumObj;

    dataConfig['albumPeeks'] = [];

    for(const key of Object.keys(dataConfig)) {
      if(!dataConfig[key].hasOwnProperty('imgs')) {
          continue;
      }
      const album = dataConfig[key];
      const albumPeekItem = { img: album.imgs[0], link: `${key}/albumPage.html`}
      dataConfig['albumPeeks'].push(albumPeekItem);
    }
  }
})

fs.emptyDirSync(distPath);

fs.copy(`${srcPath}/assets`, `${distPath}/assets`, {overwrite: false})
  .then(() =>
    fs.copy(`./node_modules/photoswipe`, `${distPath}/assets/photoswipe`, {overwrite: false})
  )
  .catch(err => {
    console.log(err);
  });

fs.copy(`${srcPath}/images`, `${distPath}/images`);

// Render and write each album
for(const key of Object.keys(dataConfig)) {
  if(!dataConfig[key].hasOwnProperty('imgs')) {
    continue;
  }
  const album = dataConfig[key];
  const fileData = path.parse('./src/pages/albumPage.ejs');
  // currently albums are saved in
  // ./public/src/pages/<album>/
  const destPath = path.join(distPath, fileData.dir, `${key}`);

  console.log(destPath);

  fs.mkdirs(destPath).then(() => {
    ejsRenderFile('./src/pages/albumPage.ejs', {album: album}).then(albumPage => {
      fs.writeFileSync(`${destPath}/${fileData.name}.html`, albumPage);
    });
  });
}

ejsRenderFile('./src/indexLayout.ejs', { albumPeeks: dataConfig['albumPeeks'] })
  .then(indexPage => {
    fs.writeFileSync(`${distPath}/index.html`, indexPage);
  })
