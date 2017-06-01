set -e

export PATH=$HOME:$PATH
#travis_retry curl -L -o $HOME/cf.tgz "https://cli.run.pivotal.io/stable?release=linux64-binary&version=6.15.0"
curl -L -o $HOME/cf.tgz "https://cli.run.pivotal.io/stable?release=linux64-binary&version=6.15.0"
tar xzvf $HOME/cf.tgz -C $HOME
cf install-plugin autopilot -f -r CF-Community

API="https://api.fr.cloud.gov"
ORG="gsa-acq-proto"
SPACE=$1

if [ $# -ne 1 ]; then
echo "Usage: deploy <space>"
exit
fi

if [ $SPACE = 'fs-intake-prod' ]; then
  NAME="forest-service-epermit"
  MANIFEST="./cg-deploy/manifests/manifest.yml"
  CF_USERNAME=$CF_USERNAME_PROD
  CF_PASSWORD=$CF_PASSWORD_PROD
elif [ $SPACE = 'fs-intake-staging' ]; then
  NAME="fs-intake-staging"
  MANIFEST="./cg-deploy/manifests/manifest-staging.yml"
  CF_USERNAME=$CF_USERNAME_DEV
  CF_PASSWORD=$CF_PASSWORD_DEV
else
echo "Unknown space: $SPACE"
exit
fi

cf login --a $API --u $CF_USERNAME --p $CF_PASSWORD --o $ORG -s $SPACE
cf apps |
while IFS= read -r LINE
  do
    PATTERN='(\w*-)+venerable'
    suffix='-venerable'
    if [[ "$LINE" =~ $PATTERN ]]; then
      # echo `expr match "$LINE" $PATTERN`
      b=${LINE%$suffix*}
      app=${b%$suffix*}
      echo $app$suffix
      cf delete -f $app$suffix
    fi
  done
cf zero-downtime-push $NAME -f $MANIFEST
