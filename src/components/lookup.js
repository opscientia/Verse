import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import contractAddresses from '../contractAddresses.json'
import contractAddressesNew from '../contractAddressesNew.json' // TODO: collapse contractAddresses and contractAddressesNew into one
import abi from '../abi/VerifyJWT.json'
import wtfBiosABI from '../abi/WTFBios.json'
import idAggABI from '../abi/IdentityAggregator.json'
import { InfoButton } from './info-button';
import { SearchBar } from './search-bar';
import Github from '../img/Github.svg';
import Google from '../img/Google.svg';
import CircleWavy from '../img/CircleWavy.svg';
import CircleWavyCheck from '../img/CircleWavyCheck.svg';
import Orcid from '../img/Orcid.svg';
import TwitterLogo from '../img/TwitterLogo.svg';
import profile from '../img/profile.svg'
import { lookup } from 'dns';
// import ToggleButton from 'react-bootstrap/ToggleButton'
// import ButtonGroup from 'react-bootstrap/ButtonGroup'
// import 'bootstrap/dist/css/bootstrap.css';

const icons = {
    google : Google,
    github : Github,
    orcid : Orcid,
    twitter : TwitterLogo

}
const { ethers } = require('ethers');  

const wtf = require('wtf-lib');
wtf.setProviderURL({polygon : 'https://rpc-mumbai.maticvigil.com'});

const sendCrypto = (signer, to) => {
    if(!signer || !to) {
        alert('Error! make sure MetaMask is set to Avalanche C testnet and you specify a recipient')
    } else {
        signer.sendTransaction({
            to: to,
            // Convert currency unit from ether to wei
            value: ethers.utils.parseEther('.1')
        })
    }
    
}

// Wraps everything on the lookup screen with style
const Wrapper = (props) => {
    return <div class="x-section bg-img wf-section" style={{width:'100vw', height:'100vh'}}>
                <div className="x-container w-container">
                    <div className="x-wrapper small-center">
                        {props.children}
                    </div>
                </div>
            </div>
}

// Looks up and displays user Holo
const Holo = (props) => {
    const [holo, setHolo] = useState({
        name: 'Anonymous',
        bio: 'No information provided',
        twitter: '',
        google: '',
        github: '',
        orcid: '0000-6969-6969'
    })

    useEffect(() => {
      if (props.filledHolo) {
        setHolo(props.filledHolo)
      }
      else {
        async function getHolo() {
          let address = await wtf.addressForCredentials(props.lookupBy, props.service.toLowerCase())
          return (await wtf.getHolo(address))[props.desiredChain]
        }
        let holo_ = getHolo()
        setHolo({...holo, ...holo_.creds, 'name' : holo_.name, 'bio' : holo_.bio})
      }
    }, [props.filledHolo, props.desiredChain, props.provider, props.account]);
      
    return <div class="x-card">
    <div class="id-card profile">
      <div class="id-card-1"><img src={profile} loading="lazy" alt="" class="id-img" /></div>
      <div class="id-card-2">
        <div class="id-profile-name-div">
          <h3 id="w-node-_0efb49bf-473f-0fcd-ca4f-da5c9faeac9a-4077819e" class="h3 no-margin">{holo.name}</h3>
        </div>
        <div class="spacer-xx-small"></div>
        <p class="id-designation">{holo.bio}</p>
      </div>
    </div>
    <div class="spacer-small"></div>
    {/* <div class="card-heading">
      <h3 class="h3 no-margin">Profile Strength</h3>
      <div class="v-spacer-small"></div>
      <h3 class="h3 no-margin active">Pro</h3>
      <InfoButton text='Profile Strength is stronger the more accounts you have, the more recently you link the accounts, and greater your social activity metrics (e.g., number of friends, followers, repositories, etc.)' />
    </div> */}
    <div class="spacer-small"></div>
    {Object.keys(holo).map(k => {
        if(k != 'name' && k != 'bio') {
            return <>
                <div class="card-text-div"><img src={icons[k]} loading="lazy" alt="" class="card-logo" />
                    <div class="card-text">{holo[k] || 'Not listed'}</div>
                    <img src={holo[k] ? CircleWavyCheck : CircleWavy} loading="lazy" alt="" class="id-verification-icon" />
                </div>
                <div class="spacer-x-small"></div>
            </>
        }
    })}
  </div>
}

//   MAKE SURE NETWORK IS SET TO THE RIGHT ONE (AVALANCHE C TESTNET)
export const Lookup = (props) => {
    const [address, setAddress] = useState(null)
    let params = useParams()
    // if the URL is just /lookup or something malformed, just return the search bar
    if (!params.web2service || !params.credentials) {
        return <Wrapper><SearchBar /></Wrapper>
    }

    if (params.web2service.includes('namebio')) {
      return (
        <>
          <Wrapper>
            <SearchBar />
            <SearchedHolos searchStr={params.credentials} desiredChain={props.desiredChain} provider={props.provider} {...props} />
          </Wrapper>
        </>
      )
    }
    const vjwt = new ethers.Contract(contractAddresses[params.web2service], abi, props.provider)
    console.log(contractAddresses[params.web2service])
    vjwt.addressForCreds(Buffer.from(params.credentials)).then(addr=>setAddress(addr))
    return <Wrapper>
                    <SearchBar />
                    <div class="spacer-large"></div>
                    {address == '0x0000000000000000000000000000000000000000' ? <p>No address with these credentials was found on Polygon testnet</p> : 
                    <>
                        <Holo {...props} lookupBy={params.credentials} service={params.web2service} > </Holo>
                        <div class="spacer-medium"></div>
                        <div class="btn-wrapper">
                            {/* <a href="/lookup" class="x-button primary outline">search again</a> */}
                            <a onClick={()=>sendCrypto(props.provider.getSigner(), address)} class="x-button primary">Pay {params.credentials}</a>
                        </div>
                    </>}
                </Wrapper>
        
    
}

export const SearchedHolos = (props) => {
  const [userHolos, setUserHolos] = useState([])
  const [loading, setLoading] = useState(true)

  async function getHolos() {
    console.log('Provier...', props.provider)
    setLoading(true)

    // Get all addresses with name/bio
    console.log('Entered getHolos in lookup.js')
    const wtfBiosAddr = contractAddressesNew['production']['WTFBios']['polygon']
    const nameAndBioContract = new ethers.Contract(wtfBiosAddr, wtfBiosABI, props.provider)
    console.log('Calling nameAndBioContract.getRegisteredAddresses() in lookup.js')
    const addrsWithNameOrBio = await nameAndBioContract.getRegisteredAddresses()
    // const addrsWithNameOrBio = ['0xcaFe2eF59688187EE312C8aca10CEB798338f7e3']
  
    console.log('addrsWithNameOrBio...', addrsWithNameOrBio)

    // Get all creds of every account with a name/bio that includes search string
    let allHolos = []
    for (const address of addrsWithNameOrBio) {
      console.log('Getting holo for address...', address)
      const holoData = await wtf.getHolo(address)
      let name = holoData[props.desiredChain]['name']
      let bio = holoData[props.desiredChain]['bio']
      if (props.searchStr.includes(name) || props.searchStr.includes(bio)) {
        let creds = holoData[props.desiredChain]['creds']
        let holoTemp = {
          'name': name,
          'bio': bio,
          'twitter': creds['twitter'],
          'google': creds['google'],
          'github': creds['github'],
          'orcid': creds['orcid'] || '0000-6969-6969'
        }
        allHolos.push(holoTemp)
      }
    }
    const userHolosTemp = allHolos.map(userHolo => (<Holo filledHolo={userHolo} {...props} />))
    console.log('userHolosTemp at line 200...', userHolosTemp)
    return userHolosTemp
  }


  useEffect(() => {
    getHolos().then(userHolosTemp => {
      setUserHolos(userHolosTemp)
      setLoading(false)
    })
  }, []) // searchStr == what the user inputed to search bar

  return (
    <>
      {loading ? <p>Loading...</p> : userHolos}
    </>
  )
}