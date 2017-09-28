
cd frontend
yarn cache dir
if [ ${CI} ]; then
yarn config set cache-folder ./server/.cache/yarn
fi
yarn cache dir
echo "Loading frontend yarn"
yarn
cd ../server
yarn cache dir
if [ ${CI} ]; then
yarn config set cache-folder ./frontend/.cache/yarn
fi
yarn cache dir
echo "Loading server yarn"
yarn
if [ ${CI} ]; then
  yarn add mocha
  yarn add nyc
else
  yarn global add mocha
  yarn global add nyc
fi
