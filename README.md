# bt-fetch-torrent
bt-fetch-torrent is a module that webtorrent and adds BEP 46(by using another module called bt-fetch-property)

bt-fetch-torrent manages and handles everything when it comes to torrents, every torrent that has an address/public key, will be updated and put back into the dht

`const BTFetchTorrent = require("bt-fetch-property")`
the line above imports BTFetchTorrent

`const btfetchTorrent = new BTFetchTorrent(folder, storage, files, external, internal, timeout, share, current, initial)`
the options are optional and not required
folder: the main directory, all data will be saved inside sub-directories of this main directory, string
storage: the name of the subdirectory which will hold the data for torrents, will look like folder/storage, string
files: the name of the subdirectory which will hold publishing data for BEP 46 torrents, string
external: the name of the sub-directory of the storage folder which will hold non-user-created torrent data, will look like folder/storage/external, string
internal: the name of the sub-directory of the storage folder which will hold user-created torrent data, will look like folder/storage/internal, string
timeout: number of milliseconds to wait until canceling downloading torrents, number
share: if non-user created torrents should start on start up, boolean
current: if non-user created BEP46 torrents should only keep it's current associated infohash or if it will keep the older infohashes as well, boolean
initial: if user created torrents should start on start up, boolean

`btfetchTorrent.ownTitle(title)` Promise
used to seed a non-BEP46 torrent that has been previously created by the user already
title: the md5 hash that is also the name of the directory that holds the data for the torrent, string
once this promise resolves, it will give you the torrent(torrent will have the following added properties: title, side, folder)

`btfetchTorrent.ownAddress(address)` Promise
used to seed a BEP46 torrent that has been previously created by the user already
address: the public key that is also the name of the directory that holds the data for the torrent, string
once the promise resolves, it will give you the torrent(torrent will have the following added properties: address, side, folder, sequence, and others)

`btfetchTorrent.loadHash(hash)` Promise
used to get a non-BEP46 torrent
hash: the 40 character infohash for the torrent that you are wanting
once the promise resolve, it will give you the torrent(torrent will have the following properties: title, side folder)

`btfetchTorrent.publishTitle(folder)` Promise
used to create a new non-BEP46 torrent by the user
folder: directory that holds the data which you want to seed
once the promise resolve, it will give you the torrent(torrent will have the following properties: title, side folder)

`btfetchTorrent.loadAddress(address)` Promise

`btfetchTorrent.publishAddress(folder, keypair)` Promise

more to come