import { near, BigInt, log,json, TypedMap, JSONValue, Value } from "@graphprotocol/graph-ts";
import {  FT ,NFT ,Account,TwitterPool,Record, Activity} from "../generated/schema";

export function handleReceipt(
  receipt: near.ReceiptWithOutcome
): void {
  const actions = receipt.receipt.actions;
  for (let i = 0; i < actions.length; i++) {
    handleAction(actions[i], receipt)
  }
}


function handleAction(
  action: near.ActionValue,
  receiptWithOutcome: near.ReceiptWithOutcome
): void {
  if (action.kind != near.ActionKind.FUNCTION_CALL) {
    return;
  }
  let timeStamp = receiptWithOutcome.block.header.timestampNanosec

  const outcome = receiptWithOutcome.outcome;
  const functionCall = action.toFunctionCall();
  const methodName = functionCall.methodName
  let sender_id = receiptWithOutcome.receipt.signerId
  let contract_id = receiptWithOutcome.receipt.receiverId
  let receiver_id = receiptWithOutcome.receipt.receiverId
  let tx_hash = receiptWithOutcome.block.header.hash
  log.info("start {}",["graph"])
  if (methodName == 'create_twitter_pool' || methodName == 'update_twitter_pool' ) {
    for (let logIndex = 0; logIndex < outcome.logs.length; logIndex++) {
      let outcomeLog = outcome.logs[logIndex].toString();
      log.info('outcomeLog {}', [outcomeLog])
      if (outcomeLog.includes('EVENT:')){
        outcomeLog = outcomeLog.replace('EVENT:','')
        const jsonData = json.try_fromString(outcomeLog)
        const jsonObject = jsonData.value.toObject()
        const name = jsonObject.get('name')
        const describe = jsonObject.get('describe')
        const cover = jsonObject.get('cover')
        const status = jsonObject.get('status')
        const update_time = jsonObject.get('update_time')
        const requirements = jsonObject.get('requirements')
        const tweet_link = jsonObject.get('twitter_link')
        const end_time = jsonObject.get('end_time')
        const create_time = jsonObject.get('create_time')
        const prizepoolObject = jsonObject.get('prize_pool')
        
        //const white_list = jsonObject.get('white_list')
        log.info('check whether null...{}',['aha'])
        if (!name || !describe || !cover || !status || !requirements || !end_time || !tweet_link || !prizepoolObject || !create_time ||  !update_time )  return
        let prizepool = prizepoolObject.toObject()
        const pool_id_obj = prizepool.get('id')
        if (!pool_id_obj) return
        let prizepool_id = pool_id_obj.toI64()
        let true_pool_id = prizepool_id.toString()
        log.info('pool_id {}',[true_pool_id])
        // 查询本奖池是否存在
        const creator_id_object = prizepool.get('creator_id')
        if (!creator_id_object) return
        let creator_id = creator_id_object.toString()
        let user = Account.load(creator_id)
        log.info('creator_id {}',[creator_id])
        // 用户不存在则 创建用户
        if (!user){
          log.info('start create {}',['user'])
          user = new Account(creator_id)
          user.name = creator_id
          user.save()
        }
        // 加载奖池
        let twitter_pool = TwitterPool.load(true_pool_id)
        if (!twitter_pool){
          twitter_pool = new TwitterPool(true_pool_id)
        }
          // define id lists
        let FTs_list : string[] = []
        let NFTs_list : string[] = []
        let join_Accounts : string[] = []
        const ft_prizes_obj = prizepool.get('ft_prizes')
        if (!ft_prizes_obj) return
        let ft_prizes = ft_prizes_obj.toArray()
          // build FT prizes
        for(let i=0;i<ft_prizes.length;i++){
            let ft = ft_prizes[i].toObject().get('ft')
            let ft_prize_id_obj = ft_prizes[i].toObject().get('prize_id')
            if (!ft_prize_id_obj || !ft) return
            // handle ft
            let token_id = ft.toObject().get('contract_id')
            if (!token_id) return
            log.info('ft_token_id {}',[token_id.toString()])
            let token_amount_obj = ft.toObject().get('balance')
            if (!token_amount_obj) return
            let token_amount = token_amount_obj.toString()
            log.info('ft amount {}',[token_amount])
            // handle ft prize part
            let ft_prize_id = ft_prize_id_obj.toI64()
            let local_ft = FT.load(ft_prize_id.toString())
            if (!local_ft){
              log.info('start create {}',['ft'])
              local_ft = new FT(ft_prize_id.toString())
              local_ft.token_id = token_id.toString()
              local_ft.amount = token_amount
              local_ft.save()
              FTs_list.push(ft_prize_id.toString())
            }
            // build activity
            let activity_id = tx_hash.toBase58() + ":create_pool_ft:" + ft_prize_id.toString()
            let activity = Activity.load(activity_id)
            if (!activity){
              activity = new Activity(activity_id)
              activity.timestamp = BigInt.fromU64(timeStamp+i)
              activity.contract_id!= contract_id
              activity.sender = sender_id
              activity.receiver = receiver_id
              activity.transaction_hash = tx_hash.toBase58()
              activity.ft = ft_prize_id.toString()
              if (methodName == "create_twitter_pool"){
                activity.msg = "Create pool " + true_pool_id
              }else{
                activity.msg = "Update pool " + true_pool_id
              }
              activity.method = methodName
              activity.type = "FT"
              activity.save()
            }
          }
  
          // NFT prize
        const nft_prizes_obj = prizepool.get('nft_prizes')
        if (!nft_prizes_obj) return
        let nft_prizes = nft_prizes_obj.toArray()
          // build FT prizes
        for(let i=0;i<nft_prizes.length;i++){
            let nft = nft_prizes[i].toObject().get('nft')
            let nft_prize_id_obj = nft_prizes[i].toObject().get('prize_id')
            if (!nft_prize_id_obj || !nft) return
            // handle ft
            let nft_token_id = nft.toObject().get('contract_id')
            if (!nft_token_id) return
            log.info('nft_token_id {}',[nft_token_id.toString()])
            let nft_id = nft.toObject().get('nft_id')
            if (!nft_id) return
            let nft_id_final = nft_id.toString()
            log.info('nft id {}',[nft_id_final.toString()])
            // handle ft prize part
            let nft_prize_id = nft_prize_id_obj.toI64()
            let local_nft = NFT.load(nft_prize_id.toString())
            if (!local_nft){
              log.info('start create {}',['ft'])
              local_nft = new NFT(nft_prize_id.toString())
              local_nft.contract_id = nft_token_id.toString()
              local_nft.nft_id = nft_id_final
              local_nft.save()
              NFTs_list.push(nft_prize_id.toString())
            }
           
            let activity_id = tx_hash.toBase58() + ":create_pool_nft:" + nft.toString()
            let activity = Activity.load(activity_id)
            if (!activity){
              activity = new Activity(activity_id)
              activity.timestamp = BigInt.fromU64(timeStamp+i)
              activity.contract_id!= contract_id
              activity.sender = sender_id
              activity.receiver = receiver_id
              activity.transaction_hash = tx_hash.toBase58()
              activity.ft = nft_id.toString()
              if (methodName == "create_twitter_pool"){
                activity.msg = "Create pool " + true_pool_id
              }else{
                activity.msg = "Update pool " + true_pool_id
              }
              activity.method = methodName
              activity.type = "NFT"
              activity.save()
            }        
          }
          log.info('start create {}',['twitter pool'])
          let whiteList : string[] = []
          let win_Accounts : string[] = []
          let win_record : string[] = []
          twitter_pool.name = name.toString()
          twitter_pool.cover = cover.toString()
          twitter_pool.describe = describe.toString()
          twitter_pool.ft_prize = FTs_list
          twitter_pool.creator_id = creator_id
          twitter_pool.nft_prize = NFTs_list
          twitter_pool.join_account = join_Accounts
          twitter_pool.end_time = end_time.toBigInt()
          twitter_pool.status = status.toString()
          twitter_pool.winner_account = win_Accounts
          twitter_pool.winner_record = win_record
          twitter_pool.update_time = update_time.toBigInt()
          twitter_pool.create_time = create_time.toBigInt()
          twitter_pool.requirement = requirements.toString()
          twitter_pool.twitter_link = tweet_link.toString()
          twitter_pool.white_list = whiteList
          twitter_pool.save()
      
          
          
        //log.info('prizepool {}',[prizepool.toString()])
      }
    }
  }

  if (methodName == 'publish_pool'){
    for (let logIndex = 0; logIndex < outcome.logs.length; logIndex++) {
      let outcomeLog = outcome.logs[logIndex].toString();
      log.info('whitelist outcomeLog {}', [outcomeLog])
      if (outcomeLog.includes('EVENT:')){
        outcomeLog = outcomeLog.replace('EVENT:','')
        const jsonData = json.try_fromString(outcomeLog)
        const jsonObject = jsonData.value.toObject()
        let pool_id = jsonObject.get('pool_id')!
        let twitter_pool = TwitterPool.load(pool_id.toString())
        if (!twitter_pool) return
        twitter_pool.status = "ONGOING"
        twitter_pool.save()
      }
    }
  }

  if (methodName == 'withdraw_ft'){
    for (let logIndex = 0; logIndex < outcome.logs.length; logIndex++) {
      let outcomeLog = outcome.logs[logIndex].toString();
      log.info('whitelist outcomeLog {}', [outcomeLog])
      if (outcomeLog.includes('EVENT:')){
        outcomeLog = outcomeLog.replace('EVENT:','')
        const jsonData = json.try_fromString(outcomeLog)
        const jsonObject = jsonData.value.toObject()
        let account_id = jsonObject.get('account_id')!
        let token_id = jsonObject.get('token_id')!
        let amount = jsonObject.get('amount')!
        let activity_id = tx_hash.toBase58() + ":withdraw_ft:" + account_id.toString() + token_id.toString() + ":" + amount.toString()
        let activity = Activity.load(activity_id)
        if (!activity){
          activity = new Activity(activity_id)
          activity.transaction_hash = tx_hash.toBase58()
          activity.timestamp = BigInt.fromU64(timeStamp)
          activity.sender = contract_id
          activity.receiver = account_id.toString()
          activity.contract_id = contract_id
          activity.msg = "Withdraw from superise: " + token_id.toString()
          activity.type = "FT"
          activity.method = methodName
          let ft = new FT(tx_hash.toBase58()+"<FT>"+receiver_id)
          ft.token_id = token_id.toString()
          ft.amount = amount.toString()
          ft.save()
          activity.ft = tx_hash.toBase58()+"<FT>"+receiver_id
          activity.save()
        }
      }
    }
  }
  if (methodName == 'withdraw_nft'){
    for (let logIndex = 0; logIndex < outcome.logs.length; logIndex++) {
      let outcomeLog = outcome.logs[logIndex].toString();
      log.info('whitelist outcomeLog {}', [outcomeLog])
      if (outcomeLog.includes('EVENT:')){
        outcomeLog = outcomeLog.replace('EVENT:','')
        const jsonData = json.try_fromString(outcomeLog)
        const jsonObject = jsonData.value.toObject()
        let account_id = jsonObject.get('account_id')!
        let nft_contract_id = jsonObject.get('contract_id')!
        let nft_id = jsonObject.get('nft_id')!
        let activity_id = tx_hash.toBase58() + ":withdraw_nft:" + account_id.toString() + nft_contract_id.toString() + ":" + nft_id.toString()
        let activity = Activity.load(activity_id)
        if (!activity){
          activity = new Activity(activity_id)
          activity.transaction_hash = tx_hash.toBase58()
          activity.timestamp = BigInt.fromU64(timeStamp)
          activity.sender = contract_id
          activity.receiver = account_id.toString()
          activity.contract_id = contract_id
          activity.msg = "Withdraw from superise: " + nft_contract_id.toString()
          activity.type = "NFT"
          activity.method = methodName
          let nft = new NFT(tx_hash.toBase58()+"<NFT>"+receiver_id)
          nft.contract_id = nft_contract_id.toString()
          nft.nft_id = nft_id.toString()
          nft.save()
          activity.ft = tx_hash.toBase58()+"<NFT>"+receiver_id
          activity.save()
        }
      }
    }
  }
  
  if (methodName == 'add_user_into_whitelist' ) {
    for (let logIndex = 0; logIndex < outcome.logs.length; logIndex++) {
      let outcomeLog = outcome.logs[logIndex].toString();
      log.info('whitelist outcomeLog {}', [outcomeLog])
      if (outcomeLog.includes('EVENT:')){
        outcomeLog = outcomeLog.replace('EVENT:','')
        const jsonData = json.try_fromString(outcomeLog)
        const jsonObject = jsonData.value.toObject()
        let pool_id = jsonObject.get('pool_id')
        if (!pool_id) return
        log.info('add user into whitelist pool_id: {}',[pool_id.toString()])
        let account_id = jsonObject.get('account_id')
        if (!account_id) return
        log.info('add user into whitelist account_id: {}',[account_id.toString()])
  
        let user = Account.load(account_id.toString())
        log.info('creator_id {}',[account_id.toString()])
        if (!user){
          log.info('start create {}',['user'])
          user = new Account(account_id.toString())
          user.name = account_id.toString()
          user.save()
        }

        let twitter_prize_pool = TwitterPool.load(pool_id.toString())
        if (!twitter_prize_pool) return
        log.info("white list find prize pool{}",[pool_id.toString()])
        let whiteList : string[] = twitter_prize_pool.white_list!
        whiteList.push(account_id.toString())
        twitter_prize_pool.white_list = whiteList
        log.info("whiteLists after {}",twitter_prize_pool.white_list!)
        twitter_prize_pool.white_list!.push(account_id.toString())
        //log.info("twitter pool describe before{}",[prize_pool.describe])
        //prize_pool.describe = "hack the graph"
        //log.info("twitter pool describe after{}",[prize_pool.describe])
        twitter_prize_pool.save()
      }
    }
  }

  if (methodName == 'join_twitter_pool' ) {
    for (let logIndex = 0; logIndex < outcome.logs.length; logIndex++) {
      let outcomeLog = outcome.logs[logIndex].toString();
      log.info('join outcomeLog {}', [outcomeLog])
      if (outcomeLog.includes('EVENT:')){
        outcomeLog = outcomeLog.replace('EVENT:','')
        const jsonData = json.try_fromString(outcomeLog)
        const jsonObject = jsonData.value.toObject()
        let pool_id = jsonObject.get('pool_id')
        if (!pool_id) return
        log.info('add user into join pool_id: {}',[pool_id.toString()])
        let account_id = jsonObject.get('account_id')
        if (!account_id) return
        log.info('add user into join account_id: {}',[account_id.toString()])
        let user = Account.load(account_id.toString())
        log.info('creator_id {}',[account_id.toString()])
        if (!user){
          log.info('start create {}',['user'])
          user = new Account(account_id.toString())
          user.name = account_id.toString()
          user.save()
        }

        let join_prize_pool = TwitterPool.load(pool_id.toString())
        if (!join_prize_pool) return
        log.info("join find prize pool{}",[pool_id.toString()])
        let joinList : string[] = join_prize_pool.join_account!
        joinList.push(account_id.toString())
        join_prize_pool.join_account = joinList
        log.info("join after {}!!!",join_prize_pool.join_account!)
        join_prize_pool.join_account!.push(account_id.toString())
        //log.info("twitter pool describe before{}",[prize_pool.describe])
        //prize_pool.describe = "hack the graph"
        //log.info("twitter pool describe after{}",[prize_pool.describe])
        join_prize_pool.save()
      } 
    }
  }

  if (methodName == 'touch_pools' ) {
    if (outcome.logs.length <= 0) return
    for (let logIndex = 0; logIndex < outcome.logs.length; logIndex++) {
      let outcomeLog = outcome.logs[logIndex].toString();
      log.info('outcomeLog {}', [outcomeLog])
      if (outcomeLog.includes('EVENT:')){
        outcomeLog = outcomeLog.replace('EVENT:','')
        const jsonData = json.try_fromString(outcomeLog)
        const jsonObject = jsonData.value.toObject()
        let pool_id = jsonObject.get('pool_id')!.toString()
        let receiver = jsonObject.get('recevier')!.toString()
        //if (!pool_id || !receiver) return
        log.info("pool_id :{},receiver: {}",[pool_id,receiver])
        let twitter_pool = TwitterPool.load(pool_id.toString())!
        if (twitter_pool.status == "ONGOING"){
          twitter_pool.status = "FINISHED"
        }
        let ft_prize = jsonObject.get('FT_prize_id')
        let nft_prize = jsonObject.get('NFT_prize_id')
        twitter_pool.winner_account!.push(receiver)
        // prize is nft
        if (!ft_prize){
          let nft_unique_id = "send_nft:"+nft_prize!.toString()
          let nft_record = Record.load(nft_unique_id)
          if (!nft_record){
            nft_record = new Record(nft_unique_id)
            nft_record.receiver = receiver
            nft_record.type = "NFT"
            nft_record.NFT_Prize = nft_prize!.toString()
            nft_record.transaction_hash = tx_hash.toBase58()
            nft_record.save()
            twitter_pool.winner_record!.push(nft_unique_id)
            //twitter_pool.save()
          }
          //let local_nft = NFT.load(nft_prize.toString())!
          let activity_id = tx_hash.toBase58() + ":send_nft:" + nft_prize!.toString()
          let activity = Activity.load(activity_id)
          if (!activity){
            activity = new Activity(activity_id)
            activity.sender = contract_id
            activity.contract_id = contract_id
            activity.receiver = receiver
            activity.transaction_hash = tx_hash.toBase58()
            activity.type = "NFT"
            activity.timestamp = BigInt.fromU64(timeStamp)
            activity.msg = "Win the pool " + pool_id.toString()
            activity.method = methodName
           
          }
        }
        // prize is ft
        if (!nft_prize){
          let ft_unique_id = "send_ft:"+ft_prize!.toString()
          let ft_record = Record.load(ft_unique_id)
          if (!ft_record){
            ft_record = new Record(ft_unique_id)
            ft_record.receiver = receiver
            ft_record.type = "FT"
            ft_record.FT_Prize = ft_prize!.toString()
            ft_record.transaction_hash = tx_hash.toBase58()
            ft_record.save()
            twitter_pool.winner_record!.push(ft_unique_id)
          }
          let activity_id = tx_hash.toBase58() + ":send_ft:" + ft_prize!.toString()
          let activity = Activity.load(activity_id)
          if (!activity){
            activity = new Activity(activity_id)
            activity.sender = contract_id
            activity.contract_id = contract_id
            activity.receiver = receiver
            activity.transaction_hash = tx_hash.toBase58()
            activity.type = "FT"
            activity.timestamp = BigInt.fromU64(timeStamp)
            activity.msg = "Win the pool " + pool_id.toString()
            activity.method = methodName
          }
        }
        twitter_pool.save()
      }
    }
    
  }
}