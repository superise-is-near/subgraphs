import { near, BigInt, log,json, TypedMap, JSONValue, Value } from "@graphprotocol/graph-ts";
import { PrizePool, FT ,NFT ,Account,TwitterPool,Record} from "../generated/schema";

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
  const outcome = receiptWithOutcome.outcome;
  const functionCall = action.toFunctionCall();
  const methodName = functionCall.methodName

  if (methodName == 'create_twitter_pool' ) {
    for (let logIndex = 0; logIndex < outcome.logs.length; logIndex++) {
      const outcomeLog = outcome.logs[logIndex].toString();
      log.info('outcomeLog {}', [outcomeLog])
      const jsonData = json.try_fromString(outcomeLog)
      const jsonObject = jsonData.value.toObject()
      const name = jsonObject.get('name')
      const describe = jsonObject.get('describe')
      const cover = jsonObject.get('cover')
      const finish = jsonObject.get('finish')
      const requirements = jsonObject.get('requirements')
      const tweet_link = jsonObject.get('twitter_link')
      const end_time = jsonObject.get('end_time')
      const create_time = jsonObject.get('create_time')
      const prizepoolObject = jsonObject.get('prize_pool')
      //const white_list = jsonObject.get('white_list')
      log.info('check whether null...{}',['aha'])
      if (!name || !describe || !cover || !finish || !requirements || !end_time || !tweet_link || !prizepoolObject || !create_time )  return
      // "name": "GitTest",
      // "describe": "sds",
      // "cover": "https://justplayproducts.com/wp-content/uploads/2020/06/78550_78551-Ryans-Mystery-Playdate-Mini-Mystery-Boxes-Call-Out-2-scaled-470x470.jpg",
      // "prize_pool": {
      //   "id": 1,
      //   "creator_id": "dravenlu.testnet",
      //   "ft_prizes": [{
      //     "prize_id": 2,
      //     "ft": {
      //       "contract_id": "wrap.testnet",
      //       "balance": "1000000000000000000000000"
      //     }
      //   }],
      //   "nft_prizes": [{
      //     "prize_id": 3,
      //     "nft": {
      //       "contract_id": "paras-token-v2.testnet",
      //       "nft_id": "39:18"
      //     }
      //   }],
      //   "join_accounts": []
      // },
      // "finish": false,
      // "end_time": 1643430660000,
      // "create_time": 1643427106797,
      // "white_list": [],
      // "requirements": "[{\"requirment_type\":\"twitter_follow\",\"screen_name\":\"#\"},{\"requirment_type\":\"twitter_retweet\",\"tweet_link\":\"http://localhost:1234/#/box/create?twitter=\"},{\"requirment_type\":\"twitter_like\",\"tweet_link\":\"http://localhost:1234/#/box/create?twitter=\"}]",
      // "twitter_near_bind": {},
      // "twitter_link": "http://localhost:1234/#/box/create?twitter="
      let prizepool = prizepoolObject.toObject()
      const pool_id_obj = prizepool.get('id')
      if (!pool_id_obj) return
      let prizepool_id = pool_id_obj.toI64()
      let true_pool_id = prizepool_id.toString()
      log.info('pool_id {}',[true_pool_id])
      // 查询本奖池是否存在
      let local_prizepool = PrizePool.load(true_pool_id)
      if (!local_prizepool){
        local_prizepool = new PrizePool(true_pool_id)
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
        }

        
        log.info('start create {}',['prizepool'])
        local_prizepool.ft_prize = FTs_list
        local_prizepool.creator_id = creator_id
        local_prizepool.nft_prize = NFTs_list
        local_prizepool.join_account = join_Accounts
        local_prizepool.save()

        let whiteList : string[] = []
        let twitter_pool = new TwitterPool(true_pool_id)
        twitter_pool.name = name.toString()
        twitter_pool.cover = cover.toString()
        twitter_pool.describe = describe.toString()
        twitter_pool.prize_pool = true_pool_id
        twitter_pool.end_time = end_time.toBigInt()
        twitter_pool.finish = finish.toBool()
        twitter_pool.create_time = create_time.toBigInt()
        twitter_pool.requirement = requirements.toString()
        twitter_pool.twitter_link = tweet_link.toString()
        twitter_pool.white_list = whiteList
        twitter_pool.save()
      }
      //log.info('prizepool {}',[prizepool.toString()])
    }
  }
  
  if (methodName == 'add_user_into_whitelist' ) {
    for (let logIndex = 0; logIndex < outcome.logs.length; logIndex++) {
      const outcomeLog = outcome.logs[logIndex].toString();
      log.info('whitelist outcomeLog {}', [outcomeLog])
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

  if (methodName == 'join_twitter_pool' ) {
    for (let logIndex = 0; logIndex < outcome.logs.length; logIndex++) {
      const outcomeLog = outcome.logs[logIndex].toString();
      log.info('join outcomeLog {}', [outcomeLog])
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

      let join_prize_pool = PrizePool.load(pool_id.toString())
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

  if (methodName == 'touch_pools' ) {
    if (outcome.logs.length <= 0) return
    for (let logIndex = 0; logIndex < outcome.logs.length; logIndex++) {
      const outcomeLog = outcome.logs[logIndex].toString();
      log.info('outcomeLog {}', [outcomeLog])
      const jsonData = json.try_fromString(outcomeLog)
      const jsonObject = jsonData.value.toObject()
      let pool_id = jsonObject.get('pool_id')!.toString()
      let receiver = jsonObject.get('recevier')!.toString()
      //if (!pool_id || !receiver) return
      log.info("pool_id :{},receiver: {}",[pool_id,receiver])
      let ft_prize = jsonObject.get('ft_prize_id')
      let nft_prize = jsonObject.get('nft_prize_id')
      // prize is nft
      if (!ft_prize){
        let nft_unique_id = "nft:"+nft_prize!.toString()
        let nft_record = Record.load(nft_unique_id)
        if (!nft_record){
          nft_record = new Record(nft_unique_id)
          nft_record.receiver = receiver
          nft_record.NFT_Prize = nft_prize!.toString()
          nft_record.save()
        }
      }
      // prize is ft
      if (!nft_prize){
        let ft_unique_id = "ft:"+ft_prize!.toString()
        let ft_record = Record.load(ft_unique_id)
        if (!ft_record){
          ft_record = new Record(ft_unique_id)
          ft_record.receiver = receiver
          ft_record.FT_Prize = ft_prize!.toString()
          ft_record.save()
        }
      }
      
    }
  }
}