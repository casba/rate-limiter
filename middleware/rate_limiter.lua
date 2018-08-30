-- Grab the redis keys from the eval call.
local tokens_key = KEYS[1]
local timestamp_key = KEYS[2]

-- Convert our arguments to the proper types.
local rate = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

-- Calculate some variables based on our arguments.
local fill_time = capacity/rate
local ttl = math.floor(fill_time*2)

-- Try to pull the tokens if they exist. If they don't, we can just 
-- set B equal to the maximum capacity.
local last_tokens = tonumber(redis.call("get", tokens_key))
if last_tokens == nil then
  last_tokens = capacity
end

-- Check the last time we refreshed this.
local last_refreshed = tonumber(redis.call("get", timestamp_key))
if last_refreshed == nil then
  last_refreshed = 0
end

-- Find the difference
local delta = math.max(0, now-last_refreshed)

-- Calculate the number of tokens that are currently in our bucket.
local filled_tokens = math.min(capacity, last_tokens+(delta*rate))

-- We'll allow the request if we requested fewer than the current amoiunt we have.
local allowed = filled_tokens >= requested

-- Grab a reference to our new tokens.
local new_tokens = filled_tokens
if allowed then
  new_tokens = filled_tokens - requested
end

-- Set these valuse on an expiring time limit
redis.call("setex", tokens_key, ttl, new_tokens)
redis.call("setex", timestamp_key, ttl, now)

-- Return the current number of tokens as well as the result of the limiting.
return { allowed, new_tokens }
