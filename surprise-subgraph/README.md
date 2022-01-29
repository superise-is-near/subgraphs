# Subgraph for Surprise
This is the sub-graph for surprise index service

## How to build
* config the contract address and start block in ```subgraph.yaml```
* go to the graph website to create a subgraph
* config the access token in your env
* graph deploy --product hosted-service ****
* go to the hosted-service playground to query

## Create Twitter Pool
```
{
  twitterPools(first: 5) {
    id
    name
    describe
    cover
    prize_pool{
      creator_id{
        id
      }
      ft_prizes{
        id
        token_id
      }
      nft_prizes{
        id
        contract_id
      }
    }
    twitter_link
    
  }
 
}
```