import React, {useState, useEffect} from 'react'
import Loader from "react-loader-spinner";
import './App.css'
import {Borg, createClient} from '@functionland/borg'
import * as queryString from 'querystring'

const parseQuery = () => {
    console.log(queryString.parse(window.location.search.slice(1)))
    const {box, content} = queryString.parse(window.location.search.slice(1))
    if (box && content) {
        const contentArr = (content as string).split(',')
        return {box, content:contentArr}
    } else {
        throw Error("url has problem")
    }
}

const fileToDataUrl = (file: File) => {
    return new Promise<string>((resolve, rejects) => {
        let reader = new FileReader()
        reader.readAsDataURL(file)
        // @ts-ignore
        reader.onloadend = (e) => resolve(reader.result)
        reader.onerror = () => rejects
    })
}

function App() {
    const [borgClient, setBorgClient] = useState<Borg>()
    const [images, setImages] = useState<{ loading: boolean, imageUri: string }[]>([])
    const [connected, setConnected] = useState(false)
    const [serverId, setServerId] = useState('')
    const [error, setError] = useState<{ message: string, show: boolean }>({message: "", show: false})

    const showError = (message: string) => {
        setError({message, show: true})
    }

    const connect = async () => {
        if (!borgClient) {
            console.log('borg not connected')
            return
        }
        try {
            await borgClient.connect(serverId)
        } catch (e) {
            showError((e as Error).message)
        }

    }

    async function startBorg() {
        const borgClient = await createClient()
        const node = borgClient.getNode()
        node.connectionManager.on('peer:disconnect', async (connection: { remotePeer: { toB58String: () => any; }; }) => {
            if (connection.remotePeer.toB58String() === serverId) {
                setConnected(false)
                setTimeout(() => {
                    if (serverId) {
                        connect()
                    }
                }, 1000)
            }
        })
        return borgClient
    }

    useEffect(() => {
        (async () => {
            try {
                const {box, content} = parseQuery()
                const temp = await startBorg()
                setBorgClient(temp)

                if (typeof box === "string") {
                    setServerId(box)
                    setConnected(await temp.connect(box))
                }
                const data = await Promise.all(content.map(value => {
                    setImages((prevState => [...prevState, {loading: true, imageUri: ""}]))
                    return temp.receiveFile(value)
                }))
                const data1 = await Promise.all(data.map(async (value) => {
                    return {loading: false, imageUri: await fileToDataUrl(value)}
                }))
                setImages(data1)
                // @ts-ignore
                // const newdata =
                console.log(data1)
            } catch (e) {
                showError((e as Error).message)
            }

        })()

    }, [])

    return (
        <div className='App'>
            <div className='Container'>
                {error.show ? <p>{error.message}</p> : ""}
                {!error.show && !connected ? <Loader type="Puff" color="#00BFFF" height={80} width={80}/> : ""}
                <div className='ImageContainer'>
                {!error.show && connected ? images.map(
                    value => value.loading ? <Loader type="Puff" color="#00BFFF" height={80} width={80}/> :

                            <img className='Image' src={value.imageUri} alt={"not ready"}/>

                ) : ""}
                </div>
            </div>
        </div>
    )
}

export default App
