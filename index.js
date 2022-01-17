const WebTorrent = require('webtorrent')
const {BTFetchProperty, verify} = require('bt-fetch-property')
const fs = require('fs-extra')
const path = require('path')
const crypto = require('crypto')
// const EventEmitter = require('events').EventEmitter

const checkHash = new RegExp('^[a-fA-F0-9]{40}$')
const checkAddress = new RegExp('^[a-fA-F0-9]{64}$')
const checkTitle = new RegExp('^[a-f0-9]{32}$')
const defOpts = {folder: __dirname, storage: 'storage', magnet: 'magnet', external: 'external', internal: 'internal', timeout: 60000, share: false, current: true, initial: true}

async function keepUpdated(self){
    self._readyToGo = false
    for(let i = 0;i < self.webtorrent.torrents.length;i++){
        if(self.webtorrent.torrents[i].address){
            try {
                await self.webproperty.bothGetPut(self.webtorrent.torrents[i])
                console.log(self.webtorrent.torrents[i].address + ' is good')
            } catch (error) {
                console.log(error)
            }
        }
        await new Promise((resolve, reject) => setTimeout(resolve, 5000))
    }
    self._readyToGo = true
}

async function startUp(self){
    if(self._status.initial){
        let checkInternal = await fs.readdir(self._internal, {withFileTypes: false})
        for(let i = 0;i < checkInternal.length;i++){
            let folderPath = self._internal + path.sep + checkInternal[i]
            if(checkAddress.test(checkInternal[i])){
                // if(self.findTheAddress(checkInternal[i])){
                //     continue
                // }
                let checkTorrent = await Promise.any([
                    new Promise((resolve, reject) => {
                        setTimeout(() => {resolve(null)}, self._status.timeout)
                    }),
                    new Promise((resolve, reject) => {
                        self.webtorrent.seed(folderPath, {destroyStoreOnDestroy: true}, torrent => {
                            resolve(torrent)
                        })
                    })
                ])
                if(checkTorrent){
                    checkTorrent.folder = folderPath
                    let checkProperty = await Promise.any([
                        new Promise((resolve, reject) => {setTimeout(() => {resolve(null)}, self._status.timeout)}),
                        new Promise((resolve, reject) => {
                            self.webproperty.ownData(checkInternal[i], checkTorrent.infoHash, (error, data) => {
                                if(error){
                                    console.log(error)
                                    self.webtorrent.remove(checkTorrent.infoHash, {destroyStore: true})
                                    resolve(null)
                                } else {
                                    resolve(data)
                                }
                            })
                        })
                    ])
                    if(checkProperty){
                        delete checkProperty.infoHash
                        for(const prop in checkProperty){
                            checkTorrent[prop] = checkProperty[prop]
                        }
                        checkTorrent.folder = folderPath
                        checkTorrent.side = true
                        console.log(checkInternal[i] + ' is good')
                    }
                }
            } else if(checkTitle.test(checkInternal[i])){
                // if(self.findTheTitle(checkInternal[i])){
                //     continue
                // }
                let checkTorrent = await Promise.any([
                    new Promise((resolve, reject) => {
                        setTimeout(() => {resolve(null)}, self._status.timeout)
                    }),
                    new Promise((resolve, reject) => {
                        self.webtorrent.seed(folderPath, {destroyStoreOnDestroy: true}, torrent => {
                            resolve(torrent)
                        })
                    })
                ])
                if(checkTorrent){
                    checkTorrent.folder = folderPath
                    checkTorrent.title = checkInternal[i]
                    checkTorrent.side = true
                    console.log(checkInternal[i] + ' is good')
                }
            } else {
                await fs.remove(folderPath)
            }
        }
    }
    if(self._status.share){
        let checkExternal = await fs.readdir(self._external, {withFileTypes: false})
        for(let i = 0;i < checkExternal.length;i++){
            let folderPath = self._external + path.sep + checkExternal[i]
            if(checkAddress.test(checkExternal[i])){
                // if(self.findTheAddress(checkExternal[i])){
                //     continue
                // }
                let checkProperty = await Promise.any([
                    new Promise((resolve, reject) => {setTimeout(() => {resolve(null)}, self._status.timeout)}),
                    new Promise((resolve, reject) => {
                        self.webproperty.resolve(checkExternal[i], (error, data) => {
                            if(error){
                                console.log(error)
                                resolve(null)
                            } else {
                                resolve(data)
                            }
                        })
                    })
                ])
                if(checkProperty){
                    if(self._status.current){
                        if(!await fs.pathExists(folderPath + path.sep + checkProperty.infoHash)){
                            try {
                                await fs.emptyDir(folderPath)
                            } catch (error) {
                                console.log(error)
                            }
                        }
                    } else if(!self._status.current){
                        try {
                            await fs.ensureDir(folderPath)
                        } catch (error) {
                            console.log(error)
                        }
                    }
                    let checkTorrent = await Promise.any([
                        new Promise((resolve, reject) => {setTimeout(() => {resolve(null)}, self._status.timeout)}),
                        new Promise((resolve, reject) => {
                            self.webtorrent.add(checkProperty.infoHash, {path: folderPath + path.sep + checkProperty.infoHash, destroyStoreOnDestroy: true}, torrent => {
                                resolve(torrent)
                            })
                        })
                    ])
                    if(checkTorrent){
                        checkTorrent.folder = folderPath
                        checkTorrent.side = false
                        delete checkProperty.infoHash
                        for(const prop in checkProperty){
                            checkTorrent[prop] = checkProperty[prop]
                        }
                        console.log(checkExternal[i] + ' is good')
                    }
                }
            } else if(checkHash.test(checkExternal[i])){
                // if(self.findTheHash(checkExternal[i])){
                //     continue
                // }
                let checkTorrent = await Promise.any([
                    new Promise((resolve, reject) => {setTimeout(() => {resolve(null)}, self._status.timeout)}),
                    new Promise((resolve, reject) => {
                        self.webtorrent.add(checkExternal[i], {path: folderPath, destroyStoreOnDestroy: true}, torrent => {
                            resolve(torrent)
                        })
                    })
                ])
                if(checkTorrent){
                    checkTorrent.folder = folderPath
                    checkTorrent.side = false
                    checkTorrent.title = crypto.createHash('md5').update(checkExternal[i]).digest("hex")
                    console.log(checkExternal[i] + ' is good')
                }
            } else {
                await fs.remove(folderPath)
            }
        }
    }
}

class BTFetchTorrent {
    constructor(opts = {}){
        // super()
        const finalOpts = {...defOpts, ...opts}
        finalOpts.folder = path.resolve(finalOpts.folder)
        fs.ensureDirSync(finalOpts.folder)

        this._status = {current: finalOpts.current, share: finalOpts.share, timeout: finalOpts.timeout, initial: finalOpts.initial}
        this._config = finalOpts.folder + path.sep + 'config.json'
        if(fs.pathExistsSync(this._config)){
            try {
                this._status = fs.readJsonSync(this._config)
            } catch (error) {
                console.log('config file is not working, using default config', error)
                this._status = {current: finalOpts.current, share: finalOpts.share, timeout: finalOpts.timeout, initial: finalOpts.initial}
                fs.writeJsonSync(this._config, this._status)
            }
        } else {
            fs.writeJsonSync(this._config, this._status)
        }

        this._storage = finalOpts.folder + path.sep + finalOpts.storage
        this._external = this._storage + path.sep + finalOpts.external
        this._internal = this._storage + path.sep + finalOpts.internal
        if(!fs.pathExistsSync(this._storage)){
            fs.ensureDirSync(this._storage)
        }
        if(!fs.pathExistsSync(this._external)){
            fs.ensureDirSync(this._external)
        }
        if(!fs.pathExistsSync(this._internal)){
            fs.ensureDirSync(this._internal)
        }
        this.webtorrent = new WebTorrent({dht: {verify}})
        this.webproperty = new BTFetchProperty({dht: this.webtorrent.dht, folder: finalOpts.folder, magnet: finalOpts.magnet})
        this.webtorrent.on('error', error => {
            console.log(error)
        })
        this._readyToGo = true
        startUp(this).catch(error => {console.log(error)})
        setInterval(() => {
            if(this._readyToGo){
                keepUpdated(this).catch(error => {console.log(error)})
            }
        }, 3600000)
    }

    async ownTitle(title){
        let haveTorrent = this.findTheTitle(title)
        if(haveTorrent){
            return haveTorrent
        }
        let folderPath = this._internal + path.sep + title
        if(!await fs.pathExists(folderPath)){
            throw new Error('folder does not exist')
        }
        checkTorrent = await Promise.race([
            new Promise((resolve, reject) => {
                setTimeout(() => {reject(new Error(title + ' took too long, it timed out'))}, this._status.timeout)
            }),
            new Promise((resolve, reject) => {
                this.webtorrent.seed(folderPath, {destroyStoreOnDestroy: true}, torrent => {
                    resolve(torrent)
                })
            })
        ])
        checkTorrent.folder = folderPath
        checkTorrent.title = title
        checkTorrent.side = true
        return checkTorrent
    }

    async ownAddress(address){
        let haveTorrent = this.findTheAddress(address)
        if(haveTorrent){
            return haveTorrent
        }
        let folderPath = this._internal + path.sep + address
        if(!await fs.pathExists(folderPath)){
            throw new Error('folder does not exist')
        }
        let checkTorrent = await Promise.race([
            new Promise((resolve, reject) => {
                setTimeout(() => {reject(new Error(address + ' took too long, it timed out'))}, this._status.timeout)
            }),
            new Promise((resolve, reject) => {
                this.webtorrent.seed(folderPath, {destroyStoreOnDestroy: true}, torrent => {
                    resolve(torrent)
                })
            })
        ])
        let checkProperty = await Promise.race([
            new Promise((resolve, reject) => {
                setTimeout(() => {
                    this.webtorrent.remove(checkTorrent.infoHash, {destroyStore: false})
                    reject(new Error(address + ' property took too long, it timed out, please try again with only the keypair without the folder'))
                },this._status.timeout)
            }),
            new Promise((resolve, reject) => {
                this.webproperty.ownData(address, checkTorrent.infoHash, (error, data) => {
                    if(error){
                        this.webtorrent.remove(checkTorrent.infoHash, {destroyStore: true})
                        this.webproperty.shred(address)
                        reject(error)
                    } else {
                        resolve(data)
                    }
                })
            })
        ])
        delete checkProperty.infoHash
        checkProperty.folder = folderPath
        checkProperty.side = true
        for(const prop in checkProperty){
            checkTorrent[prop] = checkProperty[prop]
        }
        return checkTorrent
    }

    async loadHash(hash){
        let haveTorrent = this.findTheHash(hash)
        if(haveTorrent){
            return haveTorrent
        }
        // if user had torrent before, then empty the folder so previous data does notconflict with the infohash
        let folderPath = this._external + path.sep + hash
        // try {
        //     await fs.emptyDir(folderPath)
        // } catch (error) {
        //     console.log(error)
        // }
        checkTorrent = await Promise.race([
            new Promise((resolve, reject) => {
                setTimeout(() => {reject(new Error(hash + ' took too long, it timed out'))}, this._status.timeout)
            }),
            new Promise((resolve, reject) => {
                this.webtorrent.add(hash, {path: folderPath, destroyStoreOnDestroy: true}, torrent => {
                    resolve(torrent)
                })
            })
        ])
        checkTorrent.folder = folderPath
        checkTorrent.side = false
        checkTorrent.title = crypto.createHash('md5').update(hash).digest("hex")
        return checkTorrent
    }

    async publishTitle(folder){
        if(!folder || typeof(folder) !== 'string'){
            throw new Error('path ' + folder + ' does not work')
        } else {
            folder = {oldFolder: path.resolve(folder)}
            folder.target = path.basename(folder.oldFolder)
            folder.hashed = crypto.createHash('md5').update(folder.oldFolder).digest("hex")
            folder.main = this._internal + path.sep + folder.hashed
            folder.newFolder = folder.target.includes('.') ? folder.main + path.sep + folder.target : folder.main
            let haveTorrent = this.findTheTitle(folder.hashed)
            if(haveTorrent){
                return {torrent: haveTorrent, title: haveTorrent.title}
            }
            if(folder.target.includes('.')){
                try {
                    await fs.emptyDir(folder.main)
                } catch (error) {
                    console.log(error)
                }
            }
            await fs.copy(folder.oldFolder, folder.newFolder, {overwrite: true})
        }
        let checkTorrent = await Promise.race([
            new Promise((resolve, reject) => {
                setTimeout(() => {reject(new Error('torrent took too long, it timed out'))}, this._status.timeout)
            }),
            new Promise((resolve, reject) => {
                this.webtorrent.seed(folder.main, {destroyStoreOnDestroy: true}, torrent => {
                    resolve(torrent)
                })
            })
        ])
        checkTorrent.folder = folder.main
        checkTorrent.title = folder.hashed
        checkTorrent.side = true
        return {torrent: checkTorrent, title: checkTorrent.title}
    }

    async loadAddress(address){
        let haveTorrent = this.findTheAddress(address)
        if(haveTorrent){
            return haveTorrent
        }
        let checkProperty = await Promise.race([
            new Promise((resolve, reject) => {
                setTimeout(() => {reject(new Error(address + ' property took too long, it timed out'))}, this._status.timeout)
            }),
            new Promise((resolve, reject) => {
                this.webproperty.resolve(address, (error, data) => {
                    if(error){
                        reject(error)
                    } else {
                        resolve(data)
                    }
                })
            })
        ])

        checkProperty.folder = this._external + path.sep + checkProperty.address
        checkProperty.side = false

        // if user had this torrent before and data or files were added in this folder, then the site might be messed up, we empty the folder that way the infohash is intact
        if(this._status.current){
            if(!await fs.pathExists(checkProperty.folder + path.sep + checkProperty.infoHash)){
                try {
                    await fs.emptyDir(checkProperty.folder)
                } catch (error) {
                    console.log(error)
                }
            }
        } else if(!this._status.current){
            if(!await fs.pathExists(checkProperty.folder)){
                try {
                    await fs.ensureDir(checkProperty.folder)
                } catch (error) {
                    console.log(error)
                }
            }
        }

        let checkTorrent = await Promise.race([
            new Promise((resolve, reject) => {
                setTimeout(() => {reject(new Error(checkProperty.address + ' took too long, it timed out'))}, this._status.timeout)
            }),
            new Promise((resolve, reject) => {
                this.webtorrent.add(checkProperty.infoHash, {path: checkProperty.folder + path.sep + checkProperty.infoHash, destroyStoreOnDestroy: true}, torrent => {
                    resolve(torrent)
                })
            })
        ])
        delete checkProperty.infoHash
        for(const prop in checkProperty){
            checkTorrent[prop] = checkProperty[prop]
        }
        return checkTorrent
    }
    async publishAddress(folder, keypair){
        if(!keypair || !keypair.address || !keypair.secret){
            keypair = this.webproperty.createKeypair()
        }
        let haveTorrent = this.findTheAddress(keypair.address)
        if(haveTorrent){
            return {torrent: haveTorrent, secret: null}
        }
        if(!folder || typeof(folder) !== 'string'){
            throw new Error('must have folder')
        } else {
            folder = {oldFolder: path.resolve(folder)}
            folder.main = this._internal + path.sep + keypair.address
            folder.target = path.basename(folder.oldFolder)
            folder.newFolder = folder.target.includes('.') ? folder.main + path.sep + folder.target : folder.main
            if(folder.target.includes('.')){
                try {
                    await fs.emptyDir(folder.main)
                } catch (error) {
                    console.log(error)
                }
            }
            await fs.copy(folder.oldFolder, folder.newFolder, {overwrite: true})
        }
        let checkTorrent = await Promise.race([
            new Promise((resolve, reject) => {
                setTimeout(() => {reject(new Error('torrent took too long, it timed out'))},this._status.timeout)
            }),
            new Promise((resolve, reject) => {
                this.webtorrent.seed(folder.main, {destroyStoreOnDestroy: true}, torrent => {
                    resolve(torrent)
                })
            })
        ])
        let checkProperty = await Promise.race([
            new Promise((resolve, reject) => {
                setTimeout(() => {
                    this.webtorrent.remove(checkTorrent.infoHash, {destroyStore: false})
                    reject(new Error(keypair.address + ' property took too long, it timed out, please try again with only the keypair without the folder'))
                },this._status.timeout)
            }),
            new Promise((resolve, reject) => {
                this.webproperty.publish(keypair.address, keypair.secret, {ih: checkTorrent.infoHash}, (error, data) => {
                    if(error){
                        this.webtorrent.remove(checkTorrent.infoHash, {destroyStore: true})
                        this.webproperty.shred(keypair.address)
                        reject(error)
                    } else {
                        resolve(data)
                    }
                })
            })
        ])
        const tempSecret = checkProperty.secret
        delete checkProperty.infoHash
        delete checkProperty.secret
        checkProperty.folder = folder.main
        checkProperty.side = true
        for(const prop in checkProperty){
            checkTorrent[prop] = checkProperty[prop]
        }
        return {torrent: checkTorrent, secret: tempSecret}
    }
    
    async clearData(data){
        for(let i = 0;i < this.webtorrent.torrents.length;i++){
            this.webtorrent.remove(this.webtorrent.torrents[i].infoHash, {destroyStore: false})
        }
        if(data){
            try {
                await fs.emptyDir(this._external)
                await fs.emptyDir(this._internal)
                await this.webproperty.clearData()
            } catch (error) {
                console.log(error)
            }
            return 'data was removed'
        } else {
            return 'data was stopped'
        }
    }

    stopTitle(title){
        let checkTorrent = this.findTheTitle(title)
        if(checkTorrent){
            this.webtorrent.remove(checkTorrent.infoHash, {destroyStore: false})
            return title + ' was stopped'
        } else {
            return title + ' was not found'
        }
    }
    
    async removeTitle(title){
        let checkTorrent = this.findTheTitle(title)
        if(checkTorrent){
            let folder = checkTorrent.folder
            this.webtorrent.remove(checkTorrent.infoHash, {destroyStore: false})
            if(folder){
                try {
                    await fs.remove(folder)
                } catch (error) {
                    console.log(error)
                }
            }
        } else {
            if(await fs.pathExists(this._external + path.sep + title)){
                try {
                    await fs.remove(this._external + path.sep + title)
                } catch (error) {
                    console.log(error)
                }
            }
            if(await fs.pathExists(this._internal + path.sep + title)){
                try {
                    await fs.remove(this._internal + path.sep + title)
                } catch (error) {
                    console.log(error)
                }
            }
        }
        return title + ' has been removed'
    }

    stopHash(hash){
        let checkTorrent = this.findTheHash(hash)
        if(checkTorrent){
            this.webtorrent.remove(checkTorrent.infoHash, {destroyStore: false})
            return hash + ' was stopped'
        } else {
            return hash + ' was not found'
        }
    }
    
    async removeHash(hash){
        let checkTorrent = this.findTheHash(hash)
        if(checkTorrent){
            let folder = checkTorrent.folder
            this.webtorrent.remove(checkTorrent.infoHash, {destroyStore: false})
            if(folder){
                try {
                    await fs.remove(folder)
                } catch (error) {
                    console.log(error)
                }
            }
        } else {
            if(await fs.pathExists(this._external + path.sep + hash)){
                try {
                    await fs.remove(this._external + path.sep + hash)
                } catch (error) {
                    console.log(error)
                }
            }
            if(await fs.pathExists(this._internal + path.sep + hash)){
                try {
                    await fs.remove(this._internal + path.sep + hash)
                } catch (error) {
                    console.log(error)
                }
            }
        }
        return hash + ' has been removed'
    }
    stopAddress(address){
        let checkTorrent = this.findTheAddress(address)
        if(checkTorrent){
            this.webtorrent.remove(checkTorrent.infoHash, {destroyStore: false})
            this.webproperty.carryOut(address)
            return address + ' was stopped'   
        } else {
            return address + ' was not found'
        }
    }
    async removeAddress(address){
        let checkedTorrent = this.findTheAddress(address)
        if(checkedTorrent){
            let folder = checkedTorrent.folder
            this.webtorrent.remove(checkedTorrent.infoHash, {destroyStore: false})
            if(folder){
                try {
                    await fs.remove(folder)
                } catch (error) {
                    console.log(error)
                }
            }
            // this.webproperty.carryOut(address)
            // this.webproperty.takeOut(address)
            this.webproperty.shred(address)
        } else {
            if(await fs.pathExists(this._external + path.sep + address)){
                try {
                    await fs.remove(this._external + path.sep + address)
                } catch (error) {
                    console.log(error)
                }
            }
            if(await fs.pathExists(this._internal + path.sep + address)){
                try {
                    await fs.remove(this._internal + path.sep + address)
                } catch (error) {
                    console.log(error)
                }
            }
            // this.webproperty.carryOut(address)
            // this.webproperty.takeOut(address)
            this.webproperty.shred(address)
        }
        return address + ' was removed'
    }
    configure(data, change){
        if(typeof(data) !== 'string'){
            return false
        } else if(!['current', 'share', 'timeout', 'initial'].includes(data)){
            return false
        } else if(data === 'current' && typeof(change) !== 'boolean'){
            return false
        } else if(data === 'share' && typeof(change) !== 'boolean'){
            return false
        } else if(data === 'timeout' && typeof(change) !== 'number'){
            return false
        } else if(data === 'initial' && typeof(change) !== 'boolean'){
            return false
        }
        if(data === 'timeout'){
            change = change * 1000
        }
        this._status[data] = change
        fs.writeJsonSync(this._config, this._status)
        return true
        // try {
        //     this._status[data] = change
        //     fs.writeJsonSync(this._config, this._status)
        //     return 1
        // } catch (error) {
        //     console.log(error)
        //     return -1
        // }
    }
    backToDefault(){
        this._status = {current: defOpts.current, share: defOpts.share, timeout: defOpts.timeout, initial: defOpts.initial}
        fs.writeJsonSync(this._config, this._status)
        return 'status has changed'
    }
    // changeTimeOut(data){
    //     if(!data || typeof(data) !== 'number'){
    //         return new Error('data must be a number')
    //     }
    //     this._status.timeout = data * 1000
    //     fs.writeFileSync(timeOut, JSON.stringify(this._status.timeout))
    // }
    findTheFolder(folder){
        let tempTorrent = null
        for(let i = 0;i < this.webtorrent.torrents.length;i++){
            if(this.webtorrent.torrents[i].folder === folder){
                tempTorrent = this.webtorrent.torrents[i]
                break
            }
        }
        return tempTorrent
    }
    findTheTitle(title){
        let tempTorrent = null
        for(let i = 0;i < this.webtorrent.torrents.length;i++){
            if(this.webtorrent.torrents[i].title === title){
                tempTorrent = this.webtorrent.torrents[i]
                break
            }
        }
        return tempTorrent
    }
    findTheHash(hash){
        let tempTorrent = null
        for(let i = 0;i < this.webtorrent.torrents.length;i++){
            if(this.webtorrent.torrents[i].infoHash === hash){
                tempTorrent = this.webtorrent.torrents[i]
                break
            }
        }
        return tempTorrent
    }
    findTheAddress(address){
        let tempTorrent = null
        for(let i = 0;i < this.webtorrent.torrents.length;i++){
            if(this.webtorrent.torrents[i].address === address){
                tempTorrent = this.webtorrent.torrents[i]
                break
            }
        }
        return tempTorrent
    }
}

module.exports = BTFetchTorrent