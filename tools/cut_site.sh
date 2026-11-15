set -x
X0=8142400; X1=8145600; Y0=-286800; Y1=-283600
export GDAL_HTTP_MULTIRANGE=YES GDAL_HTTP_MERGE_CONSECUTIVE_RANGES=YES CPL_VSIL_CURL_CHUNK_SIZE=4194304 GDAL_CACHEMAX=4096
time gdalwarp -overwrite -te $X0 $Y0 $X1 $Y1 -tr 1 1 -r bilinear -srcnodata -32767 -dstnodata -32767 -co COMPRESS=LZW /vsicurl/https://planetarymaps.usgs.gov/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif dem1m.tif
time gdalwarp -overwrite -te $X0 $Y0 $X1 $Y1 -tr 0.25 0.25 -r near -dstalpha -co TILED=YES -co COMPRESS=DEFLATE /vsicurl/https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif color25.tif
gdalinfo -stats dem1m.tif | tail -8
gdalinfo -stats -b 4 color25.tif | grep -i -E 'mean|min'
echo DONE
